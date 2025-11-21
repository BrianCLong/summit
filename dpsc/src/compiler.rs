use std::collections::HashMap;

use sqlparser::ast::{
    BinaryOperator, Expr, Function, FunctionArg, FunctionArgExpr, Ident, ObjectName, Select,
    SelectItem, SetExpr, Statement, Value,
};
use sqlparser::dialect::GenericDialect;
use sqlparser::parser::Parser;

use crate::annotation::DPAnnotation;
use crate::errors::{DPSCError, Result};
use crate::ledger::{LedgerEntry, PrivacyLedger};
use crate::noise::{AggregationKind, Mechanism, NoiseParameters, numeric_sensitivity};
use crate::plan::{CompilationArtifacts, NoiseInjection, NoisePlan, RewrittenQuery};
use crate::testing::TestStub;

#[derive(Default)]
pub struct DPCompiler;

pub fn compile_query(sql: &str) -> Result<CompilationArtifacts> {
    DPCompiler::default().compile(sql)
}

impl DPCompiler {
    pub fn compile(&self, sql: &str) -> Result<CompilationArtifacts> {
        let (annotation, stripped) = DPAnnotation::parse(sql)?;
        let dialect = GenericDialect {};
        let mut statements =
            Parser::parse_sql(&dialect, &stripped).map_err(|e| DPSCError::Sql(e.to_string()))?;
        if statements.len() != 1 {
            return Err(DPSCError::Sql(
                "DP compiler expects a single SELECT statement".into(),
            ));
        }
        let mut statement = statements.remove(0);

        let (noise_plans, test_stubs, ledger) =
            Self::rewrite_statement(&mut statement, &annotation)?;
        let rewritten_sql = statement.to_string();
        Ok(CompilationArtifacts {
            annotation,
            rewritten: RewrittenQuery {
                sql: rewritten_sql,
                noise: noise_plans,
            },
            ledger,
            test_stubs,
        })
    }

    fn rewrite_statement(
        statement: &mut Statement,
        annotation: &DPAnnotation,
    ) -> Result<(Vec<NoisePlan>, Vec<TestStub>, PrivacyLedger)> {
        match statement {
            Statement::Query(query) => Self::rewrite_query(query, annotation),
            _ => Err(DPSCError::Sql(
                "only SELECT queries are supported by DPSC".into(),
            )),
        }
    }

    fn rewrite_query(
        query: &mut Box<sqlparser::ast::Query>,
        annotation: &DPAnnotation,
    ) -> Result<(Vec<NoisePlan>, Vec<TestStub>, PrivacyLedger)> {
        match query.body.as_mut() {
            SetExpr::Select(select) => Self::rewrite_select(select, annotation),
            _ => Err(DPSCError::Sql(
                "set operations are not yet supported for DP compilation".into(),
            )),
        }
    }

    fn rewrite_select(
        select: &mut Box<Select>,
        annotation: &DPAnnotation,
    ) -> Result<(Vec<NoisePlan>, Vec<TestStub>, PrivacyLedger)> {
        let specs = Self::collect_specs(&select.projection)?;
        let total_components: usize = specs.iter().map(|s| s.component_count()).sum();
        if total_components == 0 {
            return Ok((Vec::new(), Vec::new(), PrivacyLedger::new()));
        }
        let epsilon_unit = annotation.epsilon / total_components as f64;
        let delta_unit = annotation.delta.map(|d| d / total_components as f64);
        let job_id = annotation
            .job_id
            .clone()
            .unwrap_or_else(|| "default_job".to_string());

        let mut ledger = PrivacyLedger::new();
        let mut noise_plans = Vec::new();
        let mut test_stubs = Vec::new();
        let mut alias_counters: HashMap<AggregationKind, usize> = HashMap::new();

        for spec in specs {
            let alias_label = spec.alias.unwrap_or_else(|| {
                let counter = alias_counters.entry(spec.kind.clone()).or_insert(0);
                *counter += 1;
                format!("{}_{}", spec.kind.as_str().to_lowercase(), counter)
            });
            match &mut select.projection[spec.index] {
                SelectItem::UnnamedExpr(expr) => {
                    Self::rewrite_expr(
                        expr,
                        &alias_label,
                        &spec.kind,
                        annotation,
                        epsilon_unit,
                        delta_unit,
                        &job_id,
                        &mut ledger,
                        &mut noise_plans,
                        &mut test_stubs,
                    )?;
                }
                SelectItem::ExprWithAlias { expr, alias } => {
                    let alias_label = alias.to_string();
                    Self::rewrite_expr(
                        expr,
                        &alias_label,
                        &spec.kind,
                        annotation,
                        epsilon_unit,
                        delta_unit,
                        &job_id,
                        &mut ledger,
                        &mut noise_plans,
                        &mut test_stubs,
                    )?;
                }
                _ => {}
            }
        }

        Ok((noise_plans, test_stubs, ledger))
    }

    fn rewrite_expr(
        expr: &mut Expr,
        target: &str,
        kind: &AggregationKind,
        annotation: &DPAnnotation,
        epsilon_unit: f64,
        delta_unit: Option<f64>,
        job_id: &str,
        ledger: &mut PrivacyLedger,
        noise_plans: &mut Vec<NoisePlan>,
        test_stubs: &mut Vec<TestStub>,
    ) -> Result<()> {
        match kind {
            AggregationKind::Count => {
                let sensitivity = 1.0;
                let params = Self::build_params(annotation, epsilon_unit, delta_unit, sensitivity)?;
                let mechanism = annotation.mechanism.clone();
                let noisy_expr = Self::add_noise(expr.clone(), mechanism.clone(), &params);
                *expr = noisy_expr;
                let plan = NoisePlan {
                    target: target.to_string(),
                    aggregation: kind.clone(),
                    mechanism: mechanism.clone(),
                    injection: NoiseInjection::Direct {
                        variance: params.variance(mechanism.clone()),
                        parameters: params.clone(),
                    },
                };
                noise_plans.push(plan);
                test_stubs.push(TestStub::new(target, mechanism.clone(), params.clone()));
                ledger.record(LedgerEntry {
                    job_id: job_id.to_string(),
                    target: target.to_string(),
                    mechanism,
                    epsilon: params.epsilon,
                    delta: params.delta,
                    sensitivity: params.sensitivity,
                });
            }
            AggregationKind::Sum => {
                let sensitivity = if let Some(s) = annotation.sensitivity {
                    s
                } else {
                    numeric_sensitivity(&annotation.bounds)?
                };
                let params = Self::build_params(annotation, epsilon_unit, delta_unit, sensitivity)?;
                let mechanism = annotation.mechanism.clone();
                let noisy_expr = Self::add_noise(expr.clone(), mechanism.clone(), &params);
                *expr = noisy_expr;
                let plan = NoisePlan {
                    target: target.to_string(),
                    aggregation: kind.clone(),
                    mechanism: mechanism.clone(),
                    injection: NoiseInjection::Direct {
                        variance: params.variance(mechanism.clone()),
                        parameters: params.clone(),
                    },
                };
                noise_plans.push(plan);
                test_stubs.push(TestStub::new(target, mechanism.clone(), params.clone()));
                ledger.record(LedgerEntry {
                    job_id: job_id.to_string(),
                    target: target.to_string(),
                    mechanism,
                    epsilon: params.epsilon,
                    delta: params.delta,
                    sensitivity: params.sensitivity,
                });
            }
            AggregationKind::Avg => {
                let func = match expr.clone() {
                    Expr::Function(f) => f,
                    other => {
                        return Err(DPSCError::UnsupportedAggregation(other.to_string()));
                    }
                };
                let numeric_sens = if let Some(s) = annotation.sensitivity {
                    s
                } else {
                    numeric_sensitivity(&annotation.bounds)?
                };
                let mechanism = annotation.mechanism.clone();
                let sum_params =
                    Self::build_params(annotation, epsilon_unit, delta_unit, numeric_sens)?;
                let count_params = Self::build_params(annotation, epsilon_unit, delta_unit, 1.0)?;

                let sum_expr = Expr::Function(Self::clone_with_name(&func, "SUM"));
                let count_expr = Expr::Function(Self::clone_with_name(&func, "COUNT"));
                let noisy_sum = Self::add_noise(sum_expr, mechanism.clone(), &sum_params);
                let noisy_count =
                    Self::add_noise(count_expr.clone(), mechanism.clone(), &count_params);
                let denominator = Expr::Function(Function {
                    name: ObjectName(vec![Ident::new("NULLIF")]),
                    args: vec![
                        FunctionArg::Unnamed(FunctionArgExpr::Expr(noisy_count.clone())),
                        FunctionArg::Unnamed(FunctionArgExpr::Expr(Expr::Value(Value::Number(
                            "0".to_string(),
                            false,
                        )))),
                    ],
                    filter: None,
                    null_treatment: None,
                    over: None,
                    distinct: false,
                    special: false,
                    order_by: Vec::new(),
                });
                *expr = Expr::BinaryOp {
                    left: Box::new(noisy_sum.clone()),
                    op: BinaryOperator::Divide,
                    right: Box::new(denominator),
                };

                let sum_plan = NoisePlan {
                    target: format!("{target}__sum"),
                    aggregation: AggregationKind::Sum,
                    mechanism: mechanism.clone(),
                    injection: NoiseInjection::Direct {
                        variance: sum_params.variance(mechanism.clone()),
                        parameters: sum_params.clone(),
                    },
                };
                let count_plan = NoisePlan {
                    target: format!("{target}__count"),
                    aggregation: AggregationKind::Count,
                    mechanism: mechanism.clone(),
                    injection: NoiseInjection::Direct {
                        variance: count_params.variance(mechanism.clone()),
                        parameters: count_params.clone(),
                    },
                };
                noise_plans.push(NoisePlan {
                    target: target.to_string(),
                    aggregation: kind.clone(),
                    mechanism: mechanism.clone(),
                    injection: NoiseInjection::Average {
                        sum: Box::new(sum_plan.clone()),
                        count: Box::new(count_plan.clone()),
                    },
                });
                test_stubs.push(TestStub::new(
                    format!("{target}__sum"),
                    mechanism.clone(),
                    sum_params.clone(),
                ));
                test_stubs.push(TestStub::new(
                    format!("{target}__count"),
                    mechanism.clone(),
                    count_params.clone(),
                ));
                ledger.record(LedgerEntry {
                    job_id: job_id.to_string(),
                    target: format!("{target}__sum"),
                    mechanism: mechanism.clone(),
                    epsilon: sum_params.epsilon,
                    delta: sum_params.delta,
                    sensitivity: sum_params.sensitivity,
                });
                ledger.record(LedgerEntry {
                    job_id: job_id.to_string(),
                    target: format!("{target}__count"),
                    mechanism,
                    epsilon: count_params.epsilon,
                    delta: count_params.delta,
                    sensitivity: count_params.sensitivity,
                });
            }
        }
        Ok(())
    }

    fn collect_specs(projection: &[SelectItem]) -> Result<Vec<AggregateSpec>> {
        let mut specs = Vec::new();
        for (index, item) in projection.iter().enumerate() {
            match item {
                SelectItem::UnnamedExpr(expr) => {
                    if let Some(kind) = Self::extract_kind(expr) {
                        specs.push(AggregateSpec {
                            index,
                            alias: None,
                            kind,
                        });
                    }
                }
                SelectItem::ExprWithAlias { expr, alias } => {
                    if let Some(kind) = Self::extract_kind(expr) {
                        specs.push(AggregateSpec {
                            index,
                            alias: Some(alias.value.clone()),
                            kind,
                        });
                    }
                }
                _ => {}
            }
        }
        Ok(specs)
    }

    fn extract_kind(expr: &Expr) -> Option<AggregationKind> {
        match expr {
            Expr::Function(Function { name, .. }) => {
                let ident = name.0.first()?;
                let name = ident.value.to_ascii_uppercase();
                match name.as_str() {
                    "COUNT" => Some(AggregationKind::Count),
                    "SUM" => Some(AggregationKind::Sum),
                    "AVG" => Some(AggregationKind::Avg),
                    _ => None,
                }
            }
            _ => None,
        }
    }

    fn build_params(
        annotation: &DPAnnotation,
        epsilon_unit: f64,
        delta_unit: Option<f64>,
        sensitivity: f64,
    ) -> Result<NoiseParameters> {
        match annotation.mechanism {
            Mechanism::Laplace => Ok(NoiseParameters::new_laplace(epsilon_unit, sensitivity)),
            Mechanism::Gaussian => {
                let delta = delta_unit.ok_or_else(|| {
                    DPSCError::AnnotationParse(
                        "gaussian mechanism requires delta in annotation".into(),
                    )
                })?;
                Ok(NoiseParameters::new_gaussian(
                    epsilon_unit,
                    delta,
                    sensitivity,
                ))
            }
        }
    }

    fn add_noise(expr: Expr, mechanism: Mechanism, params: &NoiseParameters) -> Expr {
        let noise = Expr::Function(Function {
            name: ObjectName(vec![Ident::new(match mechanism {
                Mechanism::Laplace => "laplace_noise",
                Mechanism::Gaussian => "gaussian_noise",
            })]),
            args: Self::noise_args(mechanism.clone(), params),
            filter: None,
            null_treatment: None,
            over: None,
            distinct: false,
            special: false,
            order_by: Vec::new(),
        });
        Expr::BinaryOp {
            left: Box::new(expr),
            op: BinaryOperator::Plus,
            right: Box::new(noise),
        }
    }

    fn noise_args(mechanism: Mechanism, params: &NoiseParameters) -> Vec<FunctionArg> {
        let mut args = vec![FunctionArg::Named {
            name: Ident::new("scale"),
            arg: FunctionArgExpr::Expr(Expr::Value(Value::Number(
                format!("{:.6}", params.scale),
                false,
            ))),
        }];
        args.push(FunctionArg::Named {
            name: Ident::new("epsilon"),
            arg: FunctionArgExpr::Expr(Expr::Value(Value::Number(
                format!("{:.6}", params.epsilon),
                false,
            ))),
        });
        args.push(FunctionArg::Named {
            name: Ident::new("sensitivity"),
            arg: FunctionArgExpr::Expr(Expr::Value(Value::Number(
                format!("{:.6}", params.sensitivity),
                false,
            ))),
        });
        if let Mechanism::Gaussian = mechanism {
            if let Some(delta) = params.delta {
                args.push(FunctionArg::Named {
                    name: Ident::new("delta"),
                    arg: FunctionArgExpr::Expr(Expr::Value(Value::Number(
                        format!("{:.6}", delta),
                        false,
                    ))),
                });
            }
        }
        args
    }

    fn clone_with_name(func: &Function, name: &str) -> Function {
        Function {
            name: ObjectName(vec![Ident::new(name)]),
            args: func.args.clone(),
            filter: func.filter.clone(),
            null_treatment: func.null_treatment.clone(),
            over: func.over.clone(),
            distinct: func.distinct,
            special: func.special,
            order_by: func.order_by.clone(),
        }
    }
}

#[derive(Clone)]
struct AggregateSpec {
    index: usize,
    alias: Option<String>,
    kind: AggregationKind,
}

impl AggregateSpec {
    fn component_count(&self) -> usize {
        match self.kind {
            AggregationKind::Avg => 2,
            _ => 1,
        }
    }
}

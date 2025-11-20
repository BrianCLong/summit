use pcqp::query::{Filter, FilterOp, Join, LiteralValue, LogicalQuery, Projection, TableRef};
use pcqp::Simulator;
use std::env;
use std::error::Error;
use std::fs;

fn main() -> Result<(), Box<dyn Error>> {
    let mut args = env::args().skip(1);
    match args.next().as_deref() {
        Some("plan") => {
            let mut query_json: Option<String> = None;
            while let Some(arg) = args.next() {
                if arg == "--query" {
                    let path = args
                        .next()
                        .ok_or_else(|| "--query requires a file path".to_string())?;
                    query_json = Some(fs::read_to_string(path)?);
                } else {
                    return Err(format!("unknown argument {arg}").into());
                }
            }

            let query = if let Some(json) = query_json {
                serde_json::from_str::<LogicalQuery>(&json)?
            } else {
                sample_query()
            };
            let simulator = Simulator::new_default();
            let plan = simulator.plan(&query)?;
            let json = serde_json::to_string_pretty(&plan)?;
            println!("{}", json);
            Ok(())
        }
        Some("sample-query") => {
            let query = sample_query();
            let json = serde_json::to_string_pretty(&query)?;
            println!("{}", json);
            Ok(())
        }
        _ => {
            eprintln!("Usage:\n  pcqp-cli plan [--query path]\n  pcqp-cli sample-query");
            Ok(())
        }
    }
}

fn sample_query() -> LogicalQuery {
    LogicalQuery {
        selects: vec![
            Projection {
                table: "o".to_string(),
                column: "order_id".to_string(),
                alias: Some("order_id".to_string()),
            },
            Projection {
                table: "o".to_string(),
                column: "amount".to_string(),
                alias: Some("order_amount".to_string()),
            },
            Projection {
                table: "c".to_string(),
                column: "loyalty_tier".to_string(),
                alias: Some("tier".to_string()),
            },
        ],
        from: vec![
            TableRef {
                dataset: "orders".to_string(),
                alias: "o".to_string(),
            },
            TableRef {
                dataset: "customers".to_string(),
                alias: "c".to_string(),
            },
        ],
        filters: vec![Filter {
            table: "o".to_string(),
            column: "region".to_string(),
            op: FilterOp::Eq,
            value: LiteralValue::from("US"),
        }],
        joins: vec![Join {
            left: "o".to_string(),
            right: "c".to_string(),
            on: ("customer_id".to_string(), "customer_id".to_string()),
        }],
    }
}

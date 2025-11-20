use crate::error::{AqlError, Result};
use crate::models::{Condition, ConnectorKind, ProvenanceJoin, Query, QueryPlan, TimeBounds};

pub fn parse_query(input: &str) -> Result<Query> {
    let mut tokenizer = Tokenizer::new(input);

    tokenizer.expect_keyword("FIND")?;
    let target = tokenizer.next_identifier()?;

    tokenizer.expect_keyword("WHERE")?;
    let conditions = parse_conditions(&mut tokenizer)?;

    tokenizer.expect_keyword("FROM")?;
    let connectors = parse_connectors(&mut tokenizer)?;

    let time_bounds = if tokenizer.try_expect_keyword("BETWEEN")? {
        let start = tokenizer.next_timestamp()?;
        tokenizer.expect_keyword("AND")?;
        let end = tokenizer.next_timestamp()?;
        Some(TimeBounds { start, end })
    } else {
        None
    };

    let mut provenance_joins = Vec::new();
    while tokenizer.try_expect_keyword("PROVENANCE")? {
        tokenizer.expect_keyword("JOIN")?;
        let connector_name = tokenizer.next_identifier()?;
        let connector = ConnectorKind::from_str(&connector_name)
            .ok_or_else(|| AqlError::UnknownConnector(connector_name))?;
        tokenizer.expect_keyword("ON")?;
        let field = tokenizer.next_identifier()?;
        provenance_joins.push(ProvenanceJoin { connector, field });
    }

    let proofs = if tokenizer.try_expect_keyword("WITH")? {
        tokenizer.expect_keyword("PROOFS")?;
        true
    } else {
        false
    };

    let explain = if tokenizer.try_expect_keyword("EXPLAIN")? {
        let _ = tokenizer.try_expect_keyword("TRACE")?;
        true
    } else {
        false
    };

    tokenizer.consume_trailing_whitespace();
    if !tokenizer.is_end() {
        return Err(AqlError::Execution(format!(
            "unexpected tokens at end of query: '{}'",
            tokenizer.remaining()
        )));
    }

    Ok(Query {
        target,
        conditions,
        connectors,
        time_bounds,
        provenance_joins,
        proofs,
        explain,
    })
}

pub fn compile(input: &str) -> Result<QueryPlan> {
    let query = parse_query(input)?;
    Ok(QueryPlan::new(query))
}

fn parse_conditions(tokenizer: &mut Tokenizer) -> Result<Vec<Condition>> {
    let mut conditions = Vec::new();
    loop {
        let field = tokenizer.next_identifier()?;
        tokenizer.expect_operator("=")?;
        let value = tokenizer.next_value()?;
        conditions.push(Condition { field, value });

        if tokenizer.try_expect_keyword("AND")? {
            continue;
        }
        break;
    }
    Ok(conditions)
}

fn parse_connectors(tokenizer: &mut Tokenizer) -> Result<Vec<ConnectorKind>> {
    let mut connectors = Vec::new();
    loop {
        let name = tokenizer.next_identifier()?;
        let connector =
            ConnectorKind::from_str(&name).ok_or_else(|| AqlError::UnknownConnector(name))?;
        if !connectors.contains(&connector) {
            connectors.push(connector);
        }

        if tokenizer.consume_symbol(',')? {
            continue;
        }
        break;
    }
    Ok(connectors)
}

#[derive(Clone)]
struct Tokenizer<'a> {
    chars: Vec<char>,
    index: usize,
    input: &'a str,
}

impl<'a> Tokenizer<'a> {
    fn new(input: &'a str) -> Self {
        Self {
            chars: input.chars().collect(),
            index: 0,
            input,
        }
    }

    fn is_end(&mut self) -> bool {
        self.skip_whitespace();
        self.index >= self.chars.len()
    }

    fn remaining(&self) -> String {
        self.chars
            .iter()
            .skip(self.index)
            .collect::<String>()
            .trim()
            .to_string()
    }

    fn expect_keyword(&mut self, keyword: &str) -> Result<()> {
        let ident = self.next_identifier()?;
        if ident.eq_ignore_ascii_case(keyword) {
            Ok(())
        } else {
            Err(AqlError::ExpectedKeyword(keyword.to_string()))
        }
    }

    fn try_expect_keyword(&mut self, keyword: &str) -> Result<bool> {
        let mut clone = self.clone();
        match clone.expect_keyword(keyword) {
            Ok(()) => {
                *self = clone;
                Ok(true)
            }
            Err(AqlError::ExpectedKeyword(_)) => Ok(false),
            Err(error) => Err(error),
        }
    }

    fn consume_symbol(&mut self, symbol: char) -> Result<bool> {
        self.skip_whitespace();
        if self.index >= self.chars.len() {
            return Ok(false);
        }
        if self.chars[self.index] == symbol {
            self.index += 1;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    fn expect_operator(&mut self, operator: &str) -> Result<()> {
        self.skip_whitespace();
        for expected in operator.chars() {
            if self.index >= self.chars.len() {
                return Err(AqlError::UnexpectedEof);
            }
            let actual = self.chars[self.index];
            if actual != expected {
                return Err(AqlError::ExpectedOperator(operator.to_string()));
            }
            self.index += 1;
        }
        Ok(())
    }

    fn next_identifier(&mut self) -> Result<String> {
        self.skip_whitespace();
        if self.index >= self.chars.len() {
            return Err(AqlError::UnexpectedEof);
        }
        let start = self.index;
        while self.index < self.chars.len() {
            let ch = self.chars[self.index];
            if ch.is_alphanumeric() || ch == '_' || ch == '-' || ch == '.' {
                self.index += 1;
            } else {
                break;
            }
        }
        if start == self.index {
            return Err(AqlError::ExpectedIdentifier);
        }
        Ok(self.input[start..self.index].to_string())
    }

    fn next_value(&mut self) -> Result<String> {
        self.skip_whitespace();
        if self.index >= self.chars.len() {
            return Err(AqlError::UnexpectedEof);
        }
        if self.chars[self.index] == '"' {
            self.index += 1;
            let start = self.index;
            while self.index < self.chars.len() && self.chars[self.index] != '"' {
                self.index += 1;
            }
            if self.index >= self.chars.len() {
                return Err(AqlError::ExpectedString);
            }
            let value = self.input[start..self.index].to_string();
            self.index += 1; // consume closing quote
            Ok(value)
        } else {
            let start = self.index;
            while self.index < self.chars.len() {
                let ch = self.chars[self.index];
                if ch.is_whitespace() || ch == ',' {
                    break;
                }
                self.index += 1;
            }
            if start == self.index {
                return Err(AqlError::UnexpectedEof);
            }
            Ok(self.input[start..self.index].to_string())
        }
    }

    fn next_timestamp(&mut self) -> Result<chrono::DateTime<chrono::Utc>> {
        let literal = self.next_value()?;
        literal
            .parse()
            .map_err(|_| AqlError::InvalidTimestamp(literal))
    }

    fn skip_whitespace(&mut self) {
        while self.index < self.chars.len() && self.chars[self.index].is_whitespace() {
            self.index += 1;
        }
    }

    fn consume_trailing_whitespace(&mut self) {
        self.skip_whitespace();
    }
}

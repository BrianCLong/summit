use std::fmt;

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, PartialEq)]
pub struct Program {
    pub fact_rules: Vec<FactRule>,
    pub decision_rules: Vec<DecisionRule>,
    pub default_decision: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FactRule {
    pub name: String,
    pub condition: Expr,
}

#[derive(Debug, Clone, PartialEq)]
pub struct DecisionRule {
    pub label: String,
    pub condition: Expr,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Expr {
    Identifier(String),
    BoolLiteral(bool),
    NumberLiteral(f64),
    StringLiteral(String),
    Not(Box<Expr>),
    And(Vec<Expr>),
    Or(Vec<Expr>),
    Comparison {
        left: Box<Expr>,
        op: CompareOp,
        right: Box<Expr>,
    },
    Group(Box<Expr>),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompareOp {
    Eq,
    Ne,
    Gt,
    Lt,
    Ge,
    Le,
}

impl fmt::Display for CompareOp {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let symbol = match self {
            CompareOp::Eq => "==",
            CompareOp::Ne => "!=",
            CompareOp::Gt => ">",
            CompareOp::Lt => "<",
            CompareOp::Ge => ">=",
            CompareOp::Le => "<=",
        };
        write!(f, "{}", symbol)
    }
}

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("unexpected end of input")]
    UnexpectedEof,
    #[error("unexpected token '{found}', expected {expected}")]
    UnexpectedToken { expected: String, found: String },
    #[error("duplicate fact '{0}' declared")]
    DuplicateFact(String),
    #[error("duplicate decision '{0}' declared")]
    DuplicateDecision(String),
    #[error("default decision declared multiple times")]
    DuplicateDefault,
    #[error("invalid numeric literal '{0}'")]
    InvalidNumber(String),
    #[error("unrecognized token starting with '{0}'")]
    UnknownToken(String),
}

pub fn parse_program(input: &str) -> Result<Program, ParseError> {
    let mut lexer = Lexer::new(input);
    let mut tokens = Vec::new();
    while let Some(token) = lexer.next_token()? {
        tokens.push(token);
    }

    let mut parser = Parser::new(tokens);
    parser.parse_program()
}

#[derive(Debug, Clone, PartialEq)]
enum Token {
    Fact,
    Decision,
    Default,
    If,
    And,
    Or,
    Not,
    Identifier(String),
    Bool(bool),
    Number(f64),
    String(String),
    Eq,
    Ne,
    Gt,
    Lt,
    Ge,
    Le,
    LParen,
    RParen,
    Dot,
}

struct Lexer<'a> {
    chars: std::str::Chars<'a>,
    peeked: Option<Option<char>>,
}

impl<'a> Lexer<'a> {
    fn new(input: &'a str) -> Self {
        Self {
            chars: input.chars(),
            peeked: None,
        }
    }

    fn next_char(&mut self) -> Option<char> {
        if let Some(peeked) = self.peeked.take() {
            peeked
        } else {
            self.chars.next()
        }
    }

    fn peek_char(&mut self) -> Option<char> {
        if self.peeked.is_none() {
            self.peeked = Some(self.chars.next());
        }
        self.peeked.unwrap()
    }

    fn consume_while<F: Fn(char) -> bool>(&mut self, predicate: F) -> String {
        let mut buf = String::new();
        while let Some(ch) = self.peek_char() {
            if predicate(ch) {
                buf.push(self.next_char().unwrap());
            } else {
                break;
            }
        }
        buf
    }

    fn skip_whitespace(&mut self) {
        self.consume_while(|c| c.is_whitespace() && c != '\n');
    }

    fn next_token(&mut self) -> Result<Option<Token>, ParseError> {
        loop {
            self.skip_whitespace();
            let ch = match self.next_char() {
                Some(c) => c,
                None => return Ok(None),
            };

            return Ok(Some(match ch {
                '.' => Token::Dot,
                '(' => Token::LParen,
                ')' => Token::RParen,
                '"' => {
                    let mut literal = String::new();
                    while let Some(next) = self.next_char() {
                        if next == '"' {
                            break;
                        } else if next == '\\' {
                            if let Some(escaped) = self.next_char() {
                                literal.push(escaped);
                            } else {
                                return Err(ParseError::UnexpectedEof);
                            }
                        } else {
                            literal.push(next);
                        }
                    }
                    Token::String(literal)
                }
                '0'..='9' | '-' => {
                    let mut literal = ch.to_string();
                    literal.push_str(&self.consume_while(|c| c.is_ascii_digit()));
                    if self.peek_char() == Some('.') {
                        self.next_char();
                        literal.push('.');
                        let mut has_digit = false;
                        while let Some(peek) = self.peek_char() {
                            if peek.is_ascii_digit() {
                                has_digit = true;
                                literal.push(self.next_char().unwrap());
                            } else {
                                break;
                            }
                        }
                        if !has_digit {
                            literal.pop();
                            self.peeked = Some(Some('.'));
                        }
                    }
                    let number: f64 = literal
                        .parse()
                        .map_err(|_| ParseError::InvalidNumber(literal.clone()))?;
                    Token::Number(number)
                }
                '=' => {
                    if self.peek_char() == Some('=') {
                        self.next_char();
                        Token::Eq
                    } else {
                        return Err(ParseError::UnknownToken("=".into()));
                    }
                }
                '!' => {
                    if self.peek_char() == Some('=') {
                        self.next_char();
                        Token::Ne
                    } else {
                        return Err(ParseError::UnknownToken("!".into()));
                    }
                }
                '>' => {
                    if self.peek_char() == Some('=') {
                        self.next_char();
                        Token::Ge
                    } else {
                        Token::Gt
                    }
                }
                '<' => {
                    if self.peek_char() == Some('=') {
                        self.next_char();
                        Token::Le
                    } else {
                        Token::Lt
                    }
                }
                c if is_ident_start(c) => {
                    let mut ident = String::from(c);
                    ident.push_str(&self.consume_while(is_ident_part));
                    match ident.to_ascii_lowercase().as_str() {
                        "fact" => Token::Fact,
                        "decision" => Token::Decision,
                        "default" => Token::Default,
                        "if" => Token::If,
                        "and" => Token::And,
                        "or" => Token::Or,
                        "not" => Token::Not,
                        "true" => Token::Bool(true),
                        "false" => Token::Bool(false),
                        _ => Token::Identifier(ident),
                    }
                }
                other if other.is_whitespace() => {
                    continue;
                }
                other => return Err(ParseError::UnknownToken(other.to_string())),
            }));
        }
    }
}

fn is_ident_start(ch: char) -> bool {
    ch.is_ascii_alphabetic() || ch == '_'
}

fn is_ident_part(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || ch == '_' || ch == '-'
}

struct Parser {
    tokens: Vec<Token>,
    position: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>) -> Self {
        Self {
            tokens,
            position: 0,
        }
    }

    fn parse_program(&mut self) -> Result<Program, ParseError> {
        let mut facts = Vec::new();
        let mut decisions = Vec::new();
        let mut default = None;

        while !self.is_at_end() {
            match self.peek() {
                Some(Token::Fact) => {
                    let fact = self.parse_fact()?;
                    if facts
                        .iter()
                        .any(|existing: &FactRule| existing.name == fact.name)
                    {
                        return Err(ParseError::DuplicateFact(fact.name));
                    }
                    facts.push(fact);
                }
                Some(Token::Decision) => {
                    let decision = self.parse_decision()?;
                    if decisions
                        .iter()
                        .any(|existing: &DecisionRule| existing.label == decision.label)
                    {
                        return Err(ParseError::DuplicateDecision(decision.label));
                    }
                    decisions.push(decision);
                }
                Some(Token::Default) => {
                    self.advance();
                    self.consume(Token::Decision, "'decision'")?;
                    let label = self.consume_string()?;
                    self.consume(Token::Dot, "'.'")?;
                    if default.replace(label).is_some() {
                        return Err(ParseError::DuplicateDefault);
                    }
                }
                Some(other) => {
                    return Err(ParseError::UnexpectedToken {
                        expected: "a statement".into(),
                        found: token_name(other),
                    });
                }
                None => break,
            }
        }

        Ok(Program {
            fact_rules: facts,
            decision_rules: decisions,
            default_decision: default,
        })
    }

    fn parse_fact(&mut self) -> Result<FactRule, ParseError> {
        self.consume(Token::Fact, "'fact'")?;
        let name = self.consume_identifier()?;
        self.consume(Token::If, "'if'")?;
        let condition = self.parse_expr()?;
        self.consume(Token::Dot, "'.'")?;
        Ok(FactRule { name, condition })
    }

    fn parse_decision(&mut self) -> Result<DecisionRule, ParseError> {
        self.consume(Token::Decision, "'decision'")?;
        let label = self.consume_string()?;
        self.consume(Token::If, "'if'")?;
        let condition = self.parse_expr()?;
        self.consume(Token::Dot, "'.'")?;
        Ok(DecisionRule { label, condition })
    }

    fn parse_expr(&mut self) -> Result<Expr, ParseError> {
        self.parse_or()
    }

    fn parse_or(&mut self) -> Result<Expr, ParseError> {
        let mut operands = vec![self.parse_and()?];
        while self.match_token(Token::Or) {
            operands.push(self.parse_and()?);
        }
        if operands.len() == 1 {
            Ok(operands.remove(0))
        } else {
            Ok(Expr::Or(operands))
        }
    }

    fn parse_and(&mut self) -> Result<Expr, ParseError> {
        let mut operands = vec![self.parse_unary()?];
        while self.match_token(Token::And) {
            operands.push(self.parse_unary()?);
        }
        if operands.len() == 1 {
            Ok(operands.remove(0))
        } else {
            Ok(Expr::And(operands))
        }
    }

    fn parse_unary(&mut self) -> Result<Expr, ParseError> {
        if self.match_token(Token::Not) {
            Ok(Expr::Not(Box::new(self.parse_unary()?)))
        } else {
            self.parse_comparison()
        }
    }

    fn parse_comparison(&mut self) -> Result<Expr, ParseError> {
        let mut expr = self.parse_primary()?;
        if let Some(op) = self.parse_compare_op() {
            let right = self.parse_primary()?;
            expr = Expr::Comparison {
                left: Box::new(expr),
                op,
                right: Box::new(right),
            };
        }
        Ok(expr)
    }

    fn parse_compare_op(&mut self) -> Option<CompareOp> {
        if self.match_token(Token::Eq) {
            Some(CompareOp::Eq)
        } else if self.match_token(Token::Ne) {
            Some(CompareOp::Ne)
        } else if self.match_token(Token::Ge) {
            Some(CompareOp::Ge)
        } else if self.match_token(Token::Le) {
            Some(CompareOp::Le)
        } else if self.match_token(Token::Gt) {
            Some(CompareOp::Gt)
        } else if self.match_token(Token::Lt) {
            Some(CompareOp::Lt)
        } else {
            None
        }
    }

    fn parse_primary(&mut self) -> Result<Expr, ParseError> {
        if self.match_token(Token::LParen) {
            let expr = self.parse_expr()?;
            self.consume(Token::RParen, "')'")?;
            Ok(Expr::Group(Box::new(expr)))
        } else if let Some(token) = self.advance() {
            match token {
                Token::Identifier(name) => Ok(Expr::Identifier(name)),
                Token::Bool(value) => Ok(Expr::BoolLiteral(value)),
                Token::Number(value) => Ok(Expr::NumberLiteral(value)),
                Token::String(value) => Ok(Expr::StringLiteral(value)),
                other => Err(ParseError::UnexpectedToken {
                    expected: "an expression".into(),
                    found: token_name(&other),
                }),
            }
        } else {
            Err(ParseError::UnexpectedEof)
        }
    }

    fn consume(&mut self, expected: Token, name: &str) -> Result<(), ParseError> {
        if let Some(token) = self.advance() {
            if token == expected {
                Ok(())
            } else {
                Err(ParseError::UnexpectedToken {
                    expected: name.into(),
                    found: token_name(&token),
                })
            }
        } else {
            Err(ParseError::UnexpectedEof)
        }
    }

    fn consume_identifier(&mut self) -> Result<String, ParseError> {
        if let Some(Token::Identifier(name)) = self.advance() {
            Ok(name)
        } else {
            Err(ParseError::UnexpectedToken {
                expected: "an identifier".into(),
                found: self.previous_name(),
            })
        }
    }

    fn consume_string(&mut self) -> Result<String, ParseError> {
        if let Some(Token::String(value)) = self.advance() {
            Ok(value)
        } else {
            Err(ParseError::UnexpectedToken {
                expected: "a string literal".into(),
                found: self.previous_name(),
            })
        }
    }

    fn match_token(&mut self, token: Token) -> bool {
        if self.check(&token) {
            self.advance();
            true
        } else {
            false
        }
    }

    fn check(&self, token: &Token) -> bool {
        matches!(self.peek(), Some(current) if current == token)
    }

    fn peek(&self) -> Option<&Token> {
        self.tokens.get(self.position)
    }

    fn advance(&mut self) -> Option<Token> {
        if self.is_at_end() {
            None
        } else {
            let token = self.tokens[self.position].clone();
            self.position += 1;
            Some(token)
        }
    }

    fn is_at_end(&self) -> bool {
        self.position >= self.tokens.len()
    }

    fn previous_name(&self) -> String {
        if self.position == 0 {
            "start of input".into()
        } else {
            token_name(&self.tokens[self.position - 1])
        }
    }
}

fn token_name(token: &Token) -> String {
    match token {
        Token::Fact => "'fact'".into(),
        Token::Decision => "'decision'".into(),
        Token::Default => "'default'".into(),
        Token::If => "'if'".into(),
        Token::And => "'and'".into(),
        Token::Or => "'or'".into(),
        Token::Not => "'not'".into(),
        Token::Identifier(name) => format!("identifier '{name}'"),
        Token::Bool(v) => format!("boolean literal '{v}'"),
        Token::Number(v) => format!("number literal '{v}'"),
        Token::String(v) => format!("string literal '{v}'"),
        Token::Eq => "'=='".into(),
        Token::Ne => "'!='".into(),
        Token::Gt => "'>'".into(),
        Token::Lt => "'<'".into(),
        Token::Ge => "'>='".into(),
        Token::Le => "'<='".into(),
        Token::LParen => "'('".into(),
        Token::RParen => "')'".into(),
        Token::Dot => "'.'".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_basic_program() {
        let source = "fact eligible if income >= 50000.\ndecision \"approve\" if eligible.\ndefault decision \"review\".";
        let program = parse_program(source).expect("parse");
        assert_eq!(program.fact_rules.len(), 1);
        assert_eq!(program.decision_rules.len(), 1);
        assert_eq!(program.default_decision, Some("review".into()));
    }
}

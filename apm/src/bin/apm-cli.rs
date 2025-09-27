use std::io::{self, Read};

use apm::{AccessPathMinimizer, PlanRequest, PlanResponse, SimulationRequest, TradeoffSimulator};
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "apm", version, about = "Access Path Minimizer CLI")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Rewrite a SQL query to minimize exposure while respecting task goals.
    Plan,
    /// Explore the cost/accuracy tradeoff surface across join removals.
    Simulate,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("error: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    let mut buffer = String::new();
    io::stdin().read_to_string(&mut buffer)?;

    match cli.command {
        Command::Plan => {
            let request: PlanRequest = serde_json::from_str(&buffer)?;
            let planner = AccessPathMinimizer::from_request(&request);
            let outcome = planner.plan(&request.baseline_sql, &request.goal)?;
            let response: PlanResponse = outcome.into();
            serde_json::to_writer_pretty(io::stdout(), &response)?;
        }
        Command::Simulate => {
            let request: SimulationRequest = serde_json::from_str(&buffer)?;
            let planner = AccessPathMinimizer::new(request.tables.clone(), request.joins.clone());
            let simulator = TradeoffSimulator::new(&planner, &request.baseline_sql)?;
            let points = simulator.simulate();
            serde_json::to_writer_pretty(io::stdout(), &points)?;
        }
    }

    Ok(())
}

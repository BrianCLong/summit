use clap::{Parser, Subcommand};
use decs::model::{AccessEvent, BackfillRequest, DatasetIngest, EmbargoPolicy};
use decs::scheduler::{ScheduleDiff, Scheduler, SchedulerError, SignedSchedule};
use decs::{Reconciler, SimulationReport};
use std::fs::File;
use std::io::{self, Read, Write};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "decs-scheduler")]
#[command(about = "Data Embargo & Cooling-Off Scheduler", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate a signed schedule from policies and ingest metadata
    Generate {
        #[arg(long)]
        policies: PathBuf,
        #[arg(long)]
        ingests: PathBuf,
        #[arg(long)]
        output: Option<PathBuf>,
    },
    /// Reconcile access logs against a schedule and emit a proof token
    Reconcile {
        #[arg(long)]
        schedule: PathBuf,
        #[arg(long)]
        access_log: PathBuf,
        #[arg(long)]
        output: Option<PathBuf>,
    },
    /// Simulate backfill requests against the current schedule
    Simulate {
        #[arg(long)]
        schedule: PathBuf,
        #[arg(long)]
        requests: PathBuf,
        #[arg(long)]
        output: Option<PathBuf>,
    },
    /// Compute a deterministic diff between two schedules
    Diff {
        #[arg(long)]
        previous: PathBuf,
        #[arg(long)]
        current: PathBuf,
        #[arg(long)]
        output: Option<PathBuf>,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Generate {
            policies,
            ingests,
            output,
        } => {
            let policies: Vec<EmbargoPolicy> = read_json(&policies)?;
            let ingests: Vec<DatasetIngest> = read_json(&ingests)?;
            let scheduler = Scheduler::new(policies, ingests);
            let schedule = scheduler.generate().map_err(to_io_error)?;
            write_json(output, &schedule)?;
        }
        Commands::Reconcile {
            schedule,
            access_log,
            output,
        } => {
            let schedule: SignedSchedule = read_json(&schedule)?;
            let events: Vec<AccessEvent> = read_json(&access_log)?;
            let reconciler = Reconciler::new(schedule);
            let report = reconciler.reconcile(&events);
            write_json(output, &report)?;
        }
        Commands::Simulate {
            schedule,
            requests,
            output,
        } => {
            let schedule: SignedSchedule = read_json(&schedule)?;
            let requests: Vec<BackfillRequest> = read_json(&requests)?;
            let report: SimulationReport = Scheduler::simulate_backfill(&schedule, &requests);
            write_json(output, &report)?;
        }
        Commands::Diff {
            previous,
            current,
            output,
        } => {
            let previous: SignedSchedule = read_json(&previous)?;
            let current: SignedSchedule = read_json(&current)?;
            let diffs: Vec<ScheduleDiff> = Scheduler::diff(&previous, &current);
            write_json(output, &diffs)?;
        }
    }

    Ok(())
}

fn read_json<T: serde::de::DeserializeOwned>(
    path: &PathBuf,
) -> Result<T, Box<dyn std::error::Error>> {
    let mut reader: Box<dyn Read> = if path.as_os_str() == "-" {
        let mut buffer = String::new();
        io::stdin().read_to_string(&mut buffer)?;
        return Ok(serde_json::from_str(&buffer)?);
    } else {
        Box::new(File::open(path)?)
    };

    let mut buffer = String::new();
    reader.read_to_string(&mut buffer)?;
    Ok(serde_json::from_str(&buffer)?)
}

fn write_json<T: serde::Serialize>(
    output: Option<PathBuf>,
    value: &T,
) -> Result<(), Box<dyn std::error::Error>> {
    match output {
        Some(path) => {
            let mut file = File::create(path)?;
            file.write_all(serde_json::to_string_pretty(value)?.as_bytes())?;
        }
        None => {
            println!("{}", serde_json::to_string_pretty(value)?);
        }
    }
    Ok(())
}

fn to_io_error(error: SchedulerError) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, error.to_string())
}

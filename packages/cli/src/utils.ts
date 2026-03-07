/**
 * Summit CLI Utilities
 *
 * Shared utility functions for the CLI.
 *
 * @module @summit/cli/utils
 */

/* eslint-disable no-console */
import chalk from "chalk";

/**
 * Format data as a table
 */
export function formatOutput<T extends object>(data: T[], columns: string[]): string {
  if (data.length === 0) {
    return "";
  }

  // Calculate column widths
  const widths: Record<string, number> = {};
  columns.forEach((col) => {
    widths[col] = Math.max(
      col.length,
      ...data.map((row) => String((row as Record<string, unknown>)[col] || "").length)
    );
  });

  // Header
  const headerRow = columns.map((col) => col.toUpperCase().padEnd(widths[col])).join("  ");
  const separator = columns.map((col) => "─".repeat(widths[col])).join("──");

  // Data rows
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const value = String((row as Record<string, unknown>)[col] || "");
        return value.padEnd(widths[col]);
      })
      .join("  ")
  );

  return [chalk.bold(headerRow), separator, ...dataRows].join("\n");
}

/**
 * Format a date string
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength - 3)}...`;
}

/**
 * Parse key=value pairs from string array
 */
export function parseKeyValue(pairs: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  pairs.forEach((pair) => {
    const [key, ...valueParts] = pair.split("=");
    if (key && valueParts.length > 0) {
      result[key] = valueParts.join("=");
    }
  });
  return result;
}

/**
 * Create progress indicator
 */
export function createSpinner(message: string): {
  start: () => void;
  stop: (success?: boolean) => void;
  update: (msg: string) => void;
} {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;
  let interval: NodeJS.Timeout | null = null;
  let currentMessage = message;

  return {
    start() {
      process.stdout.write("\x1B[?25l"); // Hide cursor
      interval = setInterval(() => {
        process.stdout.write(`\r${chalk.blue(frames[frameIndex])} ${currentMessage}`);
        frameIndex = (frameIndex + 1) % frames.length;
      }, 80);
    },
    stop(success = true) {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      const icon = success ? chalk.green("✓") : chalk.red("✗");
      process.stdout.write(`\r${icon} ${currentMessage}\n`);
      process.stdout.write("\x1B[?25h"); // Show cursor
    },
    update(msg: string) {
      currentMessage = msg;
    },
  };
}

/**
 * Confirm action with user
 */
export async function confirm(message: string, defaultValue = false): Promise<boolean> {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const defaultHint = defaultValue ? "(Y/n)" : "(y/N)";

  return new Promise((resolve) => {
    rl.question(`${message} ${defaultHint} `, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      if (normalized === "") {
        resolve(defaultValue);
      } else {
        resolve(normalized === "y" || normalized === "yes");
      }
    });
  });
}

/**
 * Print error and exit
 */
export function exitWithError(message: string, code = 1): never {
  console.error(chalk.red(`Error: ${message}`));
  process.exit(code);
}

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

/**
 * Print warning message
 */
export function warn(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * Print info message
 */
export function info(message: string): void {
  console.log(chalk.blue(`ℹ ${message}`));
}

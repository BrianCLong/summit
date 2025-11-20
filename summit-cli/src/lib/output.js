import chalk from 'chalk';
import ora from 'ora';
import logSymbols from 'log-symbols';
import stripAnsi from 'strip-ansi';
import { table } from 'table';

/**
 * OutputFormatter handles multiple output modes (human, JSON, NDJSON)
 * and provides a consistent interface for all commands
 */
export class OutputFormatter {
  constructor(config) {
    this.config = config;
    this.format = config.output?.defaultFormat || 'human';
    this.color = config.output?.color !== false;
    this.verbose = false;
    this.quiet = false;
    this.spinner = null;
    this.commandStart = null;
  }

  setFormat(format) {
    this.format = format;
    if (format !== 'human') {
      this.color = false;
    }
  }

  setColor(enabled) {
    this.color = enabled;
    if (!enabled) {
      chalk.level = 0;
    }
  }

  setVerbose(enabled) {
    this.verbose = enabled;
  }

  setQuiet(enabled) {
    this.quiet = enabled;
  }

  /**
   * Start a command execution context
   */
  startCommand(commandName, args = {}) {
    this.commandStart = new Date().toISOString();

    if (this.format === 'ndjson') {
      this.ndjson({
        type: 'start',
        command: commandName,
        args,
        timestamp: this.commandStart,
      });
    }
  }

  /**
   * End a command execution context
   */
  endCommand(success = true, data = null) {
    const timestamp = new Date().toISOString();

    if (this.format === 'json') {
      this.json({
        command: process.argv.slice(2).join(' '),
        startTime: this.commandStart,
        endTime: timestamp,
        success,
        data,
      });
    } else if (this.format === 'ndjson') {
      this.ndjson({
        type: 'complete',
        success,
        timestamp,
        data,
      });
    }
  }

  /**
   * Show a spinner with a message
   */
  spin(text) {
    if (this.format === 'human' && !this.quiet) {
      if (this.spinner) {
        this.spinner.stop();
      }
      this.spinner = ora(text).start();
    }
  }

  /**
   * Update spinner text
   */
  spinUpdate(text) {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  /**
   * Mark spinner as successful
   */
  spinSucceed(text) {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    }
  }

  /**
   * Mark spinner as failed
   */
  spinFail(text) {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    }
  }

  /**
   * Stop and clear spinner
   */
  spinStop() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Log success message
   */
  success(message, data = null) {
    if (this.format === 'human' && !this.quiet) {
      console.log(logSymbols.success, chalk.green(message));
    } else if (this.format === 'ndjson') {
      this.ndjson({ type: 'success', message, data, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Log error message
   */
  error(message, error = null) {
    if (this.format === 'human') {
      console.error(logSymbols.error, chalk.red(message));
      if (error && this.verbose) {
        console.error(chalk.dim(error.stack || error));
      }
    } else if (this.format === 'ndjson') {
      this.ndjson({
        type: 'error',
        message,
        error: error ? { message: error.message, stack: error.stack } : null,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Log warning message
   */
  warning(message) {
    if (this.format === 'human' && !this.quiet) {
      console.warn(logSymbols.warning, chalk.yellow(message));
    } else if (this.format === 'ndjson') {
      this.ndjson({ type: 'warning', message, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Log info message
   */
  info(message) {
    if (this.format === 'human' && !this.quiet) {
      console.log(logSymbols.info, chalk.blue(message));
    } else if (this.format === 'ndjson') {
      this.ndjson({ type: 'info', message, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Log debug message (only in verbose mode)
   */
  debug(message) {
    if (this.verbose) {
      if (this.format === 'human') {
        console.log(chalk.dim('DEBUG:', message));
      } else if (this.format === 'ndjson') {
        this.ndjson({ type: 'debug', message, timestamp: new Date().toISOString() });
      }
    }
  }

  /**
   * Log progress update
   */
  progress(current, total, message = '') {
    if (this.format === 'human' && !this.quiet) {
      const percent = Math.round((current / total) * 100);
      const bar = this.progressBar(current, total, 30);
      console.log(`${bar} ${percent}% ${message}`);
    } else if (this.format === 'ndjson') {
      this.ndjson({
        type: 'progress',
        current,
        total,
        percent: (current / total) * 100,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Render a table
   */
  table(headers, rows) {
    if (this.format === 'human' && !this.quiet) {
      const data = [headers, ...rows];
      console.log(table(data));
    } else if (this.format === 'json') {
      const objects = rows.map((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i];
        });
        return obj;
      });
      this.json(objects);
    } else if (this.format === 'ndjson') {
      rows.forEach((row) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i];
        });
        this.ndjson(obj);
      });
    }
  }

  /**
   * Output JSON
   */
  json(data) {
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * Output newline-delimited JSON
   */
  ndjson(data) {
    console.log(JSON.stringify(data));
  }

  /**
   * Generate a progress bar
   */
  progressBar(current, total, width = 30) {
    const percent = current / total;
    const filled = Math.round(width * percent);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return chalk.cyan(bar);
  }

  /**
   * Format duration in human-readable form
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get plain text (strip ANSI codes)
   */
  plain(text) {
    return stripAnsi(text);
  }
}

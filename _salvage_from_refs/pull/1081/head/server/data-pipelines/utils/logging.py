"""
Logging utilities for IntelGraph Data Pipelines
Structured logging with metrics and monitoring integration
"""

import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from loguru import logger as loguru_logger

    LOGURU_AVAILABLE = True
except ImportError:
    LOGURU_AVAILABLE = False


class StructuredFormatter(logging.Formatter):
    """
    Custom formatter that outputs structured JSON logs
    """

    def format(self, record):
        # Create structured log entry
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add extra fields if present
        if hasattr(record, "extra_fields"):
            log_entry.update(record.extra_fields)

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


class DataPipelineLogger:
    """
    Enhanced logger for data pipeline operations
    Provides structured logging with pipeline-specific context
    """

    def __init__(self, name: str, log_level: str = "INFO"):
        self.name = name
        self.log_level = log_level.upper()

        if LOGURU_AVAILABLE:
            self._setup_loguru()
        else:
            self._setup_standard_logging()

        # Pipeline context
        self.pipeline_context = {}

    def _setup_loguru(self):
        """Setup logging using loguru (preferred)"""
        # Remove default logger
        loguru_logger.remove()

        # Add console handler with structured format
        loguru_logger.add(
            sys.stdout,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level=self.log_level,
            serialize=False,
        )

        # Add file handler for persistent logs
        log_file = Path("logs") / f"{self.name}.log"
        log_file.parent.mkdir(exist_ok=True)

        loguru_logger.add(
            log_file,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {extra} | {message}",
            level=self.log_level,
            rotation="1 day",
            retention="30 days",
            compression="gz",
        )

        # Bind logger name
        self.logger = loguru_logger.bind(name=self.name)

    def _setup_standard_logging(self):
        """Setup using standard Python logging"""
        self.logger = logging.getLogger(self.name)
        self.logger.setLevel(getattr(logging, self.log_level))

        # Prevent duplicate handlers
        if self.logger.handlers:
            return

        # Console handler with structured format
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, self.log_level))
        console_handler.setFormatter(StructuredFormatter())
        self.logger.addHandler(console_handler)

        # File handler
        log_file = Path("logs") / f"{self.name}.log"
        log_file.parent.mkdir(exist_ok=True)

        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(getattr(logging, self.log_level))
        file_handler.setFormatter(StructuredFormatter())
        self.logger.addHandler(file_handler)

    def set_context(self, **kwargs):
        """Set pipeline context that will be included in all log messages"""
        self.pipeline_context.update(kwargs)

    def clear_context(self):
        """Clear pipeline context"""
        self.pipeline_context = {}

    def _log_with_context(self, level: str, message: str, **kwargs):
        """Log message with pipeline context"""
        context = {**self.pipeline_context, **kwargs}

        if LOGURU_AVAILABLE:
            getattr(self.logger, level.lower())(message, **context)
        else:
            # Add context as extra fields for standard logging
            record = self.logger.makeRecord(
                name=self.name,
                level=getattr(logging, level.upper()),
                fn="",
                lno=0,
                msg=message,
                args=(),
                exc_info=None,
            )
            record.extra_fields = context
            self.logger.handle(record)

    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self._log_with_context("DEBUG", message, **kwargs)

    def info(self, message: str, **kwargs):
        """Log info message"""
        self._log_with_context("INFO", message, **kwargs)

    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self._log_with_context("WARNING", message, **kwargs)

    def error(self, message: str, **kwargs):
        """Log error message"""
        self._log_with_context("ERROR", message, **kwargs)

    def critical(self, message: str, **kwargs):
        """Log critical message"""
        self._log_with_context("CRITICAL", message, **kwargs)

    def log_ingestion_start(
        self, connector_name: str, source_info: dict[str, Any], batch_size: int = None
    ):
        """Log the start of data ingestion"""
        context = {
            "event_type": "ingestion_start",
            "connector": connector_name,
            "source": source_info,
            "batch_size": batch_size,
        }
        self.info(f"Starting data ingestion from {connector_name}", **context)

    def log_ingestion_progress(
        self,
        connector_name: str,
        records_processed: int,
        records_success: int,
        records_failed: int,
        throughput_per_sec: float = None,
    ):
        """Log ingestion progress"""
        context = {
            "event_type": "ingestion_progress",
            "connector": connector_name,
            "records_processed": records_processed,
            "records_success": records_success,
            "records_failed": records_failed,
            "success_rate": records_success / records_processed if records_processed > 0 else 0,
            "throughput_per_sec": throughput_per_sec,
        }
        self.info(
            f"Ingestion progress: {records_processed} processed, "
            f"{records_success} success, {records_failed} failed",
            **context,
        )

    def log_ingestion_complete(
        self, connector_name: str, stats: dict[str, Any], duration_seconds: float
    ):
        """Log ingestion completion"""
        context = {
            "event_type": "ingestion_complete",
            "connector": connector_name,
            "stats": stats,
            "duration_seconds": duration_seconds,
            "throughput_per_sec": (
                stats.get("records_success", 0) / duration_seconds if duration_seconds > 0 else 0
            ),
        }
        self.info(f"Ingestion completed for {connector_name} in {duration_seconds:.2f}s", **context)

    def log_validation_results(
        self,
        entity_type: str,
        total_records: int,
        valid_records: int,
        validation_stats: dict[str, Any],
    ):
        """Log validation results"""
        context = {
            "event_type": "validation_results",
            "entity_type": entity_type,
            "total_records": total_records,
            "valid_records": valid_records,
            "invalid_records": total_records - valid_records,
            "validation_rate": valid_records / total_records if total_records > 0 else 0,
            "stats": validation_stats,
        }
        self.info(
            f"Validation completed: {valid_records}/{total_records} records valid "
            f"({context['validation_rate']:.2%})",
            **context,
        )

    def log_transformation_results(
        self,
        input_records: int,
        output_entities: int,
        entity_types: dict[str, int],
        duration_seconds: float,
    ):
        """Log transformation results"""
        context = {
            "event_type": "transformation_results",
            "input_records": input_records,
            "output_entities": output_entities,
            "entity_types": entity_types,
            "duration_seconds": duration_seconds,
            "entities_per_second": (
                output_entities / duration_seconds if duration_seconds > 0 else 0
            ),
        }
        self.info(
            f"Transformation completed: {input_records} records → {output_entities} entities "
            f"in {duration_seconds:.2f}s",
            **context,
        )

    def log_load_results(
        self,
        target_system: str,
        entities_loaded: int,
        entities_failed: int,
        duration_seconds: float,
    ):
        """Log data loading results"""
        context = {
            "event_type": "load_results",
            "target_system": target_system,
            "entities_loaded": entities_loaded,
            "entities_failed": entities_failed,
            "total_entities": entities_loaded + entities_failed,
            "success_rate": (
                entities_loaded / (entities_loaded + entities_failed)
                if (entities_loaded + entities_failed) > 0
                else 0
            ),
            "duration_seconds": duration_seconds,
            "entities_per_second": (
                entities_loaded / duration_seconds if duration_seconds > 0 else 0
            ),
        }
        self.info(
            f"Loading to {target_system} completed: {entities_loaded} loaded, "
            f"{entities_failed} failed in {duration_seconds:.2f}s",
            **context,
        )


# Global logger instances
_loggers = {}


def get_logger(name: str, log_level: str = "INFO") -> DataPipelineLogger:
    """
    Get or create a logger instance
    """
    if name not in _loggers:
        _loggers[name] = DataPipelineLogger(name, log_level)
    return _loggers[name]


def setup_logging(log_level: str = "INFO", log_dir: Path = None):
    """
    Global logging setup
    """
    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)

    # Configure root logger
    root_logger = get_logger("intelgraph-pipelines", log_level)
    root_logger.info(
        "Logging configured", log_level=log_level, log_dir=str(log_dir) if log_dir else None
    )

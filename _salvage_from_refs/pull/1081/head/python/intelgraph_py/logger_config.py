import logging

from pythonjsonlogger import jsonlogger


def setup_logging():
    logger = logging.getLogger("intelgraph_analytics")
    logger.setLevel(logging.INFO)

    # Check if handlers already exist to prevent adding multiple handlers
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = jsonlogger.JsonFormatter(fmt="%(asctime)s %(levelname)s %(name)s %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


# Initialize logger
logger = setup_logging()

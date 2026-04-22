import logging


def get_logger(name: str) -> logging.Logger:
    # Central place to configure logging later.
    # For now, it just returns a standard logger.
    return logging.getLogger(name)

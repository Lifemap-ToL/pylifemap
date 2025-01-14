"""
Misc utilities functions and values.
"""

import logging
import sys

DEFAULT_WIDTH = "800px"
DEFAULT_HEIGHT = "600px"

logger = logging.getLogger("LifemapBuilder")
ch = logging.StreamHandler(stream=sys.stdout)
logger.addHandler(ch)
logger.setLevel(logging.DEBUG)


def check_marimo() -> bool:
    """
    Check if we are currently in a marimo notebook.

    Returns
    -------
    bool
        True if we are running in a marimo notebook environment, False otherwise.
    """

    try:
        import marimo  # noqa: F401

        return True
    except ImportError:
        return False


def check_jupyter() -> bool:
    """
    Check if we are currently in a jupyter notebook.

    Returns
    -------
    bool
        True if we are running in a jupyter notebook environment, False otherwise.
    """

    try:
        _ = get_ipython().__class__.__name__
        return True
    except NameError:
        return False

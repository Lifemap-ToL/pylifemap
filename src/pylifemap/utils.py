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


def is_notebook() -> bool:
    """
    Checks if we are currently in a notebook.

    Returns
    -------
    bool
        True if we are running in a notebook environment, False otherwise.
    """
    try:
        _ = get_ipython().__class__.__name__
        return True
    except NameError:
        return False

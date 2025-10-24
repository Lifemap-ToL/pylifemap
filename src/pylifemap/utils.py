"""
Misc utilities functions and values.
"""

import logging
import re
import sys

DEFAULT_WIDTH = "800px"
DEFAULT_HEIGHT = "600px"
LIFEMAP_BACK_URL = "https://lifemap-back.univ-lyon1.fr"

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
        import marimo  # type: ignore # basedpyright: ignore[reportUnusedImport]  # noqa: F401, PLC0415

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
        _ = get_ipython().__class__.__name__  # type: ignore
        return True
    except NameError:
        return False


def is_hex_color(value: str) -> bool:
    """
    Check if a value is an hexadecimal color code.

    Parameters
    ----------
    value : str
        Value to be checked.

    Returns
    -------
    bool
        True if the value is an hexadecimal color code.
    """
    match = re.fullmatch(r"#([0-9a-f]{6}|[0-9a-f]{3})", value, flags=re.IGNORECASE)
    return match is not None

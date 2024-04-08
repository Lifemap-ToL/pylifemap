"""
Misc utilities functions and values.
"""

import importlib.resources

import polars as pl

LMDATA_FILE = "data/lmdata.parquet"
LMDATA_PATH = str(importlib.resources.files("pylifemap").joinpath(LMDATA_FILE))
LMDATA = pl.read_parquet(LMDATA_PATH)

DEFAULT_WIDTH = "800px"
DEFAULT_HEIGHT = "600px"


def is_notebook() -> bool:
    """
    Checks if we are currently in a notebook.

    Returns
    -------
    bool
        True if we are running in a notebook environment, False otherwise.
    """
    try:
        test = get_ipython().__class__.__name__  # noqa: F841
        return True
    except NameError:
        return False

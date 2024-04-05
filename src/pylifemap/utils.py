"""
Misc utilities functions and values.
"""

import importlib.resources

import polars as pl

LMDATA_FILE = "data/lmdata.parquet"
LMDATA_PATH = str(importlib.resources.files("pylifemap").joinpath(LMDATA_FILE))
LMDATA = pl.read_parquet(LMDATA_PATH)

DEFAULT_WIDTH = "100%"
DEFAULT_HEIGHT = "600px"

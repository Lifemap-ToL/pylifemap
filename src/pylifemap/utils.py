import importlib.resources

LMDATA_FILE = "data/lmdata_minimal.parquet"
LMDATA_PATH = str(importlib.resources.files("pylifemap").joinpath(LMDATA_FILE))

import pandas as pd
import polars as pl
import polars.selectors as cs

from pylifemap.serialization import serialize_data
from pylifemap.utils import LMDATA_PATH


class LifemapData:

    def __init__(
        self,
        data: pl.DataFrame | pd.DataFrame,
        *,
        taxid_col: str,
        x_col: str,
        y_col: str,
    ):
        self.taxid_col = taxid_col
        self.x_col = x_col
        self.y_col = y_col
        self.base_cols = [self.taxid_col, "pylifemap_x", "pylifemap_y"]

        if isinstance(data, pd.DataFrame):
            data = pl.DataFrame(data)

        self.data = data

    def locate(self) -> None:
        lmdata = pl.read_parquet(LMDATA_PATH)
        rename = {"lon": "pylifemap_x", "lat": "pylifemap_y"}
        for col in ["zoom", "depth", "parent", "n_childs"]:
            rename[col] = f"pylifemap_{col}"
        lmdata = lmdata.rename(rename)
        self.data = self.data.join(
            lmdata, how="inner", left_on=self.taxid_col, right_on="taxid"
        )

    def rename_xy(self) -> None:
        rename = {self.x_col: "pylifemap_x", self.y_col: "pylifemap_y"}
        self.data = self.data.rename(rename)

    def points_data(self, options: dict | None = None) -> bytes:
        cols = self.base_cols
        if options is not None:
            if "fill_col" in options:
                cols.append(options["fill_col"])
            if "radius_col" in options:
                cols.append(options["radius_col"])
        data = self.data.select(set(cols))
        return serialize_data(data)

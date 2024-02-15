import pandas as pd
import polars as pl

from pylifemap.serialize import serialize_data
from pylifemap.utils import LMDATA_PATH


class DataComputations:

    def __init__(
        self,
        data: pl.DataFrame | pd.DataFrame,
        *,
        locate: bool,
        taxid_col: str,
        x_col: str,
        y_col: str,
    ):
        self.taxid_col = taxid_col
        self.x_col = x_col
        self.y_col = y_col
        self.base_cols = [self.taxid_col, self.x_col, self.y_col]

        if isinstance(data, pd.DataFrame):
            data = pl.DataFrame(data)
        self.data = data
        if locate:
            self.locate_data()

    def locate_data(self) -> None:
        lmdata = pl.read_parquet(LMDATA_PATH)
        rename = {"lon": "pylifemap_x", "lat": "pylifemap_y"}
        for col in ["zoom", "depth", "parent", "n_childs"]:
            rename[col] = f"pylifemap_{col}"
        lmdata = lmdata.rename(rename)
        self.data = self.data.join(
            lmdata, how="inner", left_on=self.taxid_col, right_on="taxid"
        )

    def points_data(self, radius_col: str | None, fill_col: str | None) -> bytes:
        cols = self.base_cols + [
            col for col in [radius_col, fill_col] if col is not None
        ]
        data = self.data.select(set(cols))
        return serialize_data(data)

    def heatmap_data(self) -> bytes:
        data = self.data.select([self.x_col, self.y_col])
        return serialize_data(data)

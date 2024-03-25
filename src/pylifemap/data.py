"""
Handling of Lifemap objects data.
"""

import pandas as pd
import polars as pl

from pylifemap.serialization import serialize_data
from pylifemap.utils import LMDATA


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

        if isinstance(data, pd.DataFrame):
            data = pl.DataFrame(data)

        self.data = data

    def locate(self) -> None:
        lmdata = LMDATA.select(
            ["taxid", "pylifemap_x", "pylifemap_y", "pylifemap_parent"]
        )
        self.data = self.data.join(
            lmdata, how="inner", left_on=self.taxid_col, right_on="taxid"
        )

    def data_with_parents(self) -> pl.DataFrame:
        data = self.data
        if "pylifemap_parent" not in data.columns:
            lmdata = LMDATA.select(["taxid", "pylifemap_parent"])
            self.data = self.data.join(
                lmdata, how="inner", left_on=self.taxid_col, right_on="taxid"
            )
        return data

    def rename_xy(self) -> None:
        rename = {self.x_col: "pylifemap_x", self.y_col: "pylifemap_y"}
        self.data = self.data.rename(rename)

    def points_data(self, options: dict | None = None) -> bytes:
        cols = [self.taxid_col, "pylifemap_x", "pylifemap_y"]
        if options is not None:
            if "fill_col" in options and options["fill_col"] is not None:
                cols.append(options["fill_col"])
            if "radius_col" in options and options["radius_col"] is not None:
                cols.append(options["radius_col"])
        data = self.data.select(set(cols))
        return serialize_data(data)

    def lines_data(self, options: dict | None = None) -> bytes:

        data = self.data_with_parents()
        data = (
            data.rename({"pylifemap_x": "pylifemap_x0", "pylifemap_y": "pylifemap_y0"})
            .join(
                LMDATA.select(
                    pl.col("taxid"),
                    pl.col("pylifemap_x").alias("pylifemap_x1"),
                    pl.col("pylifemap_y").alias("pylifemap_y1"),
                ),
                left_on="pylifemap_parent",
                right_on="taxid",
                how="left",
            )
            .filter(
                (pl.col("pylifemap_x1").is_not_null())
                & (pl.col("pylifemap_y1").is_not_null())
            )
        )

        cols = [
            self.taxid_col,
            "pylifemap_x0",
            "pylifemap_y0",
            "pylifemap_x1",
            "pylifemap_y1",
        ]
        if options is not None:
            if "width_col" in options and options["width_col"] is not None:
                cols.append(options["width_col"])
            if "color_col" in options and options["color_col"] is not None:
                cols.append(options["color_col"])
        data = data.select(set(cols))

        return serialize_data(data)

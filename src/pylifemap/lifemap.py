from __future__ import annotations

import pandas as pd
import polars as pl
from ipywidgets.embed import embed_minimal_html

from pylifemap.layers_parser import LayersParser
from pylifemap.utils import LMDATA_PATH
from pylifemap.widget import LifemapWidget

DEFAULT_WIDTH = "100%"
DEFAULT_HEIGHT = "600px"


class Lifemap:
    def __init__(
        self,
        data: pd.DataFrame | pl.DataFrame,
        *,
        locate: bool = True,
        taxid_col: str = "taxid",
        x_col: str = "pylifemap_x",
        y_col: str = "pylifemap_y",
        zoom: int = 5,
        legend_position: str = "bottomright",
        legend_width: int | None = None,
    ) -> None:
        self.layers = []
        if isinstance(data, pd.DataFrame):
            data = pl.from_pandas(data)
        self.data = data
        self.taxid_col = taxid_col
        self.x_col = x_col
        self.y_col = y_col

        if locate:
            self.locate_data()

        self.needed_cols = [self.taxid_col, self.x_col, self.y_col]
        self.map_options = {
            "zoom": zoom,
            "legend_position": legend_position,
            "legend_width": legend_width,
        }

    def locate_data(self) -> None:
        lmdata = pl.read_parquet(LMDATA_PATH)
        rename = {"lon": "pylifemap_x", "lat": "pylifemap_y"}
        for col in ["zoom", "depth", "parent", "n_childs"]:
            rename[col] = f"pylifemap_{col}"
        lmdata = lmdata.rename(rename)
        self.data = self.data.join(
            lmdata, how="inner", left_on=self.taxid_col, right_on="taxid"
        )

    def layer_points(
        self,
        *,
        radius: int = 4,
        radius_col: str | None = None,
        fill_col: str | None = None,
        fill_col_cat: bool | None = None,
        scheme: str | None = None,
        opacity: float = 0.1,
        popup: bool | None = False,
    ) -> Lifemap:
        options = locals()
        del options["self"]
        self.layers.append({"layer": "points", "options": options})
        return self

    def plot(
        self, width: str = DEFAULT_WIDTH, height: str = DEFAULT_HEIGHT
    ) -> LifemapWidget:
        layers_parser = LayersParser(self.layers, self.data)
        layers = layers_parser.parse()
        return LifemapWidget(
            layers=layers,
            options=self.map_options,
            width=width,
            height=height,
        )

    def save(
        self, path: str, width: str = DEFAULT_WIDTH, height: str = DEFAULT_HEIGHT
    ) -> None:
        embed_minimal_html(
            path, views=[self.plot(width=width, height=height)], drop_defaults=False
        )

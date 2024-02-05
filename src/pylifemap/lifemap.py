from __future__ import annotations

import pandas as pd
import polars as pl
from IPython.display import display
from ipywidgets.embed import embed_minimal_html

from pylifemap.data_computations import DataComputations
from pylifemap.widget import LifemapWidget

DEFAULT_WIDTH = "100%"
DEFAULT_HEIGHT = "600px"


class Lifemap:
    def __init__(
        self,
        data: pl.DataFrame | pd.DataFrame,
        *,
        locate: bool = True,
        taxid_col: str = "taxid",
        x_col: str = "pylifemap_x",
        y_col: str = "pylifemap_y",
        zoom: int = 5,
        legend_position: str = "bottomright",
        legend_width: int | None = None,
        width: str = DEFAULT_WIDTH,
        height: str = DEFAULT_HEIGHT,
    ) -> None:

        self.layers = []
        self.data = {}
        self.width = width
        self.height = height

        self.data_computations = DataComputations(
            data, locate=locate, taxid_col=taxid_col, x_col=x_col, y_col=y_col
        )

        self.map_options = {
            "zoom": zoom,
            "legend_position": legend_position,
            "legend_width": legend_width,
        }

    def to_widget(self) -> LifemapWidget:
        return LifemapWidget(
            layers=self.layers,
            options=self.map_options,
            width=self.width,
            height=self.height,
        )

    def __repr__(self):
        # Override default __repr__ to avoid very long and slow text output
        return "<LifemapWidget>"

    def show(self):
        display(self.to_widget())

    def save(self, path, title: str = "Lifemap") -> None:
        embed_minimal_html(
            path, views=[self.to_widget()], drop_defaults=False, title=title
        )

    def generate_layer_points(self, options: dict) -> dict:
        radius_col = options["radius_col"] if "radius_col" in options else None
        fill_col = options["fill_col"] if "fill_col" in options else None
        data = self.data_computations.points_data(
            radius_col=radius_col, fill_col=fill_col
        )
        return {"layer": "points", "data": data, "options": options}

    def generate_layer_heatmap(self, options: dict) -> dict:
        data = self.data_computations.heatmap_data()
        return {"layer": "heatmap", "data": data, "options": options}

    def generate_layer_grid(self, options: dict) -> dict:
        data = self.data_computations.heatmap_data()
        return {"layer": "grid", "data": data, "options": options}

    def generate_layer_screengrid(self, options: dict) -> dict:
        data = self.data_computations.heatmap_data()
        return {"layer": "screengrid", "data": data, "options": options}

    def layer_points(
        self,
        *,
        radius: float = 4,
        radius_col: str | None = None,
        fill_col: str | None = None,
        fill_col_cat: bool | None = None,
        scheme: str | None = None,
        opacity: float = 0.1,
        popup: bool | None = False,
    ) -> Lifemap:
        options = locals()
        del options["self"]
        layer = self.generate_layer_points(options)
        self.layers.append(layer)
        return self

    def layer_heatmap(
        self,
        *,
        radius: float = 30,
        intensity: float = 5,
        threshold: float = 0.05,
        opacity: float = 0.5,
        color_range: list | None = None,
    ) -> Lifemap:
        options = locals()
        del options["self"]
        layer = self.generate_layer_heatmap(options)
        self.layers.append(layer)
        return self

    def layer_grid(
        self,
        *,
        cell_size: int = 500,
        extruded: bool = False,
        opacity: float = 0.5,
    ) -> Lifemap:
        options = locals()
        del options["self"]
        layer = self.generate_layer_grid(options)
        self.layers.append(layer)
        return self

    def layer_screengrid(
        self,
        *,
        cell_size: int = 30,
        extruded: bool = False,
        opacity: float = 0.5,
    ) -> Lifemap:
        options = locals()
        del options["self"]
        layer = self.generate_layer_screengrid(options)
        self.layers.append(layer)
        return self

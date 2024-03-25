""" 
Main Lifemap object.
"""

from __future__ import annotations

import pandas as pd
import polars as pl
from IPython.display import display
from ipywidgets.embed import embed_minimal_html

from pylifemap.data import LifemapData
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

        self.width = width
        self.height = height
        self.layers = []
        self.layers_counter = 0
        self.layers_data = {}

        self.data = LifemapData(data, taxid_col=taxid_col, x_col=x_col, y_col=y_col)

        if locate:
            # Geolocate species
            self.data.locate()
        else:
            # Rename x_col and y_col to "pylifemap_x" and "pylifemap_y"
            self.data.rename_xy()

        self.map_options = {
            "zoom": zoom,
            "legend_position": legend_position,
            "legend_width": legend_width,
        }

    def to_widget(self) -> LifemapWidget:
        return LifemapWidget(
            data=self.layers_data,
            layers=self.layers,
            options=self.map_options,
            width=self.width,
            height=self.height,
        )

    def __repr__(self) -> str:
        # Override default __repr__ to avoid very long and slow text output
        return "<LifemapWidget>"

    def show(self) -> None:
        display(self.to_widget())

    def save(self, path, title: str = "Lifemap") -> None:
        embed_minimal_html(
            path, views=[self.to_widget()], drop_defaults=False, title=title
        )

    def process_options(self, options: dict) -> dict:
        self.layers_counter += 1
        options["id"] = f"layer{self.layers_counter}"
        del options["self"]
        return options

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
        options = self.process_options(locals())
        layer = {"layer": "points", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.points_data(options)
        return self

    def layer_points_ol(
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
        options = self.process_options(locals())
        layer = {"layer": "points_ol", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.points_data(options)
        return self

    def layer_lines(
        self,
        *,
        width: float = 4,
        width_col: str | None = None,
        color_col: str | None = None,
        scheme: str | None = None,
        opacity: float = 0.1,
        popup: bool | None = False,
    ) -> Lifemap:
        options = self.process_options(locals())
        layer = {"layer": "lines", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.lines_data(options)
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
        options = self.process_options(locals())
        layer = {"layer": "heatmap", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.points_data()
        return self

    def layer_grid(
        self,
        *,
        cell_size: int = 500,
        extruded: bool = False,
        opacity: float = 0.5,
    ) -> Lifemap:
        options = self.process_options(locals())
        layer = {"layer": "grid", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.points_data()
        return self

    def layer_screengrid(
        self,
        *,
        cell_size: int = 30,
        extruded: bool = False,
        opacity: float = 0.5,
    ) -> Lifemap:
        options = self.process_options(locals())
        layer = {"layer": "screengrid", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.points_data()
        return self

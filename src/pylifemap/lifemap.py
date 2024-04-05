"""
Main Lifemap object.
"""

from __future__ import annotations

from typing import Literal

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
        taxid_col: str = "taxid",
        zoom: int = 5,
        legend_width: int | None = None,
        width: int | str = DEFAULT_WIDTH,
        height: int | str = DEFAULT_HEIGHT,
    ) -> None:

        self.data = LifemapData(data, taxid_col=taxid_col)

        self.width = width if isinstance(width, str) else f"{width}px"
        self.height = height if isinstance(height, str) else f"{height}px"
        self.layers = []
        self.layers_counter = 0
        self.layers_data = {}

        self.map_options = {
            "zoom": zoom,
            "legend_width": legend_width,
        }

    def _to_widget(self) -> LifemapWidget:
        return LifemapWidget(
            data=self.layers_data,
            layers=self.layers,
            options=self.map_options,
            width=self.width,
            height=self.height,
        )

    def _process_options(self, options: dict) -> dict:
        self.layers_counter += 1
        options["id"] = f"layer{self.layers_counter}"
        del options["self"]
        return options

    def __repr__(self) -> str:
        # Override default __repr__ to avoid very long and slow text output
        return "<LifemapWidget>"

    def show(self) -> None:
        display(self._to_widget())

    def save(self, path, title: str = "Lifemap") -> None:
        embed_minimal_html(
            path, views=[self._to_widget()], drop_defaults=False, title=title
        )

    def layer_points(
        self,
        *,
        leaves: Literal["show", "only", "omit"] = "show",
        radius: float | None = None,
        radius_col: str | None = None,
        fill_col: str | None = None,
        fill_col_cat: bool | None = None,
        scheme: str | None = None,
        opacity: float | None = 0.8,
        popup: bool | None = False,
    ) -> Lifemap:
        options = self._process_options(locals())
        options["z_col"] = "pylifemap_zoom"
        leaves_values = ["show", "only", "omit"]
        if options["leaves"] not in leaves_values:
            msg = f"leaves must be one of {leaves_values}"
            raise ValueError(msg)
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
        options = self._process_options(locals())
        layer = {"layer": "points_ol", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.points_data(options)
        return self

    def layer_donuts(
        self,
        counts_col: str,
        *,
        size: float | None = None,
        scheme: str | None = None,
        opacity: float | None = 1,
        popup: bool | None = False,
        show_leaves: bool = False,
    ) -> Lifemap:
        options = self._process_options(locals())
        options["z_col"] = "pylifemap_zoom"
        options["label"] = counts_col
        layer = {"layer": "donuts", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.donuts_data(options)
        if show_leaves:
            points_id = f"{options['id']}-points"
            points_options = {
                "id": points_id,
                "scheme": scheme,
                "opacity": 1,
                "popup": popup,
                "fill_col": options["counts_col"],
            }
            points_layer = {"layer": "points", "options": points_options}
            self.layers.append(points_layer)
            points_options["leaves"] = "only"
            self.layers_data[points_id] = self.data.points_data(points_options)

        return self

    def layer_lines(
        self,
        *,
        width: float | None = None,
        width_col: str | None = None,
        color_col: str | None = None,
        scheme: str | None = None,
        opacity: float | None = 0.8,
        popup: bool | None = False,
    ) -> Lifemap:
        options = self._process_options(locals())
        layer = {"layer": "lines", "options": options}
        self.layers.append(layer)
        if color_col is not None:
            options["scale_extent"] = [
                self.data.data.get_column(color_col).min(),
                self.data.data.get_column(color_col).max(),
            ]
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
        options = self._process_options(locals())
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
        options = self._process_options(locals())
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
        options = self._process_options(locals())
        layer = {"layer": "screengrid", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.points_data()
        return self

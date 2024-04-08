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
from pylifemap.utils import DEFAULT_HEIGHT, DEFAULT_WIDTH
from pylifemap.widget import LifemapWidget


class Lifemap:
    """
    Main class allowing to create visualizations.
    """

    def __init__(
        self,
        data: pl.DataFrame | pd.DataFrame,
        *,
        taxid_col: str = "taxid",
        width: int | str = DEFAULT_WIDTH,
        height: int | str = DEFAULT_HEIGHT,
        zoom: int = 5,
        legend_width: int | None = None,
    ) -> None:
        """
        Lifemap constructor.

        Allows to initialize a Lifemap visualization with a DataFrame and some
        global options.

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame
            Lifemap visualization DataFrame.
        taxid_col : str, optional
            Name of the `data` column with taxonomy ids, by default "taxid"
        width : int | str, optional
            Lifemap visualization width, in pixels or CSS units, by
            default `DEFAULT_WIDTH`
        height : int | str, optional
            Lifemap visualization height, in pixels or CSS units, by
            default DEFAULT_HEIGHT
        zoom : int, optional
            Default Lifemap zoom level, by default 5
        legend_width : int | None, optional
            Legend width in pixels, by default None
        """

        # Init LifemapData object with data
        self.data = LifemapData(data, taxid_col=taxid_col)

        # Convert width and height to CSS pixels if integers
        self.width = width if isinstance(width, str) else f"{width}px"
        self.height = height if isinstance(height, str) else f"{height}px"

        # Init layers attributes
        self.layers = []
        self.layers_counter = 0
        self.layers_data = {}

        # Store global map options
        self.map_options = {
            "zoom": zoom,
            "legend_width": legend_width,
        }

    def __repr__(self) -> str:
        # Override default __repr__ to avoid very long and slow text output
        return "<LifemapWidget>"

    def _to_widget(self) -> LifemapWidget:
        """
        Convert current instance to a Jupyter Widget.

        Returns
        -------
        LifemapWidget
            An Anywidget widget.
        """
        return LifemapWidget(
            data=self.layers_data,
            layers=self.layers,
            options=self.map_options,
            width=self.width,
            height=self.height,
        )

    def _process_options(self, options: dict) -> dict:
        """
        Process a layer options dictionary.

        The method increments layer counter, generates a layer id and deletes a `self`
        option.

        Parameters
        ----------
        options : dict
            Options dictionary.

        Returns
        -------
        dict
            Processed dictionary.
        """
        self.layers_counter += 1
        options["id"] = f"layer{self.layers_counter}"
        del options["self"]
        return options

    def show(self) -> None:
        """
        Display the Jupyter widget for this instance.
        """
        display(self._to_widget())

    def save(self, path: str, title: str = "Lifemap") -> None:
        """
        Save the Jupyter widget for this instance to an HTML file.

        Parameters
        ----------
        path : str
            Path to the HTML file to save the widget.
        title : str, optional
            Optional HTML page title, by default "Lifemap"
        """
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
        label: str | None = None,
    ) -> Lifemap:
        """
        Add a points layer.

        Parameters
        ----------
        leaves : Literal[&quot;show&quot;, &quot;only&quot;, &quot;omit&quot;], optional
            If `"only"`, only show tree leaves. If `"omit"`, only show nodes that are
            not leaves. If `"show"`, show all nodes, by default "show"
        radius : float | None, optional
            Base points radius, by default None
        radius_col : str | None, optional
            Name of a numeric DataFrame column to compute points radius, by default None
        fill_col : str | None, optional
            Name of a DataFrame column to determine points color, by default None
        fill_col_cat : bool | None, optional
            If True, force color scheme to be categorical instead of continuous,
            by default None
        scheme : str | None, optional
            Color scheme for points color. If `fill_col` is defined, it is the name of
            an [Observable Plot color scale](https://observablehq.com/plot/features/scales#color-scales).
            Otherwise, it is an hexadecimal color value, by default None
        opacity : float | None, optional
            Points opacity as a floating number between 0 and 1, by default 0.8
        popup : bool | None, optional
            If True, display informations in a popup when a point is clicked,
            by default False
        label : str | None, optional
            Legend title for this layer if `fill_col` is defined. If `None`, the value
            of `fill_col` is used.

        Returns
        -------
        Lifemap
            A Lifemap visualization object.

        Raises
        ------
        ValueError
            If leaves is not one of the allowed values.
        """
        options = self._process_options(locals())
        leaves_values = ["show", "only", "omit"]
        if options["leaves"] not in leaves_values:
            msg = f"leaves must be one of {leaves_values}"
            raise ValueError(msg)
        layer = {"layer": "points", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.points_data(options)
        return self

    # TODO : cleanup
    # def layer_points_ol(
    #     self,
    #     *,
    #     radius: float = 4,
    #     radius_col: str | None = None,
    #     fill_col: str | None = None,
    #     fill_col_cat: bool | None = None,
    #     scheme: str | None = None,
    #     opacity: float = 0.1,
    #     popup: bool | None = False,
    # ) -> Lifemap:
    #     options = self._process_options(locals())
    #     layer = {"layer": "points_ol", "options": options}
    #     self.layers.append(layer)
    #     self.layers_data[options["id"]] = self.data.points_data(options)
    #     return self

    def layer_donuts(
        self,
        counts_col: str,
        *,
        radius: float | None = None,
        leaves: Literal["show", "hide"] = "hide",
        scheme: str | None = None,
        opacity: float | None = 1,
        popup: bool | None = True,
        label: str | None = None,
    ) -> Lifemap:
        """
        Add a donuts layer.

        This layer displays the distribution of a categorical variable values among
        each nodes' children. Optionnaly it can also represent leaves values as a
        point layer.

        It should be applied to data computed with [](`~pylifemap.aggregate_freq`).

        Parameters
        ----------
        counts_col : str
            DataFrame column containing the counts.
        radius : float | None, optional
            Donut charts radius, by default None
        leaves : Literal[&quot;show&quot;, &quot;hide&quot;], optional
            If `"show"`, add a points layer with individual leaves values, by
            default "hide"
        scheme : str | None, optional
            Color scheme for donut charts ans points. It is the name of
            a categorical [Observable Plot color scale](https://observablehq.com/plot/features/scales#color-scales),
            by default None
        opacity : float | None, optional
            Donut charts and points opacity, by default 1
        popup : bool | None, optional
            If True, display informations in a popup when a point is clicked,
            by default False, by default True
        label : str | None, optional
            Legend title for this layer. If `None`, the value of `counts_col` is used.


        Returns
        -------
        Lifemap
            A Lifemap visualization object.


        Raises
        ------
        ValueError
            If leaves is not one of the allowed values.
        """
        options = self._process_options(locals())
        leaves_values = ["show", "hide"]
        if options["leaves"] not in leaves_values:
            msg = f"leaves must be one of {leaves_values}"
            raise ValueError(msg)
        options["label"] = counts_col if options["label"] is None else options["label"]
        layer = {"layer": "donuts", "options": options}
        self.layers.append(layer)
        self.layers_data[options["id"]] = self.data.donuts_data(options)

        # If leaves is "show", add a specific points layer
        if leaves == "show":
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
        label: str | None = None,
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

    # TODO: cleanup
    # def layer_grid(
    #     self,
    #     *,
    #     cell_size: int = 500,
    #     extruded: bool = False,
    #     opacity: float = 0.5,
    # ) -> Lifemap:
    #     options = self._process_options(locals())
    #     layer = {"layer": "grid", "options": options}
    #     self.layers.append(layer)
    #     self.layers_data[options["id"]] = self.data.points_data()
    #     return self

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

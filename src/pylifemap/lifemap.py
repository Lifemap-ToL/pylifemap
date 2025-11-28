"""
Main Lifemap object.
"""

from __future__ import annotations

import os
import re
import webbrowser
from collections.abc import Sequence
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Literal

import pandas as pd
import polars as pl
from IPython.display import display
from ipywidgets.embed import dependency_state, embed_minimal_html

from pylifemap.data import LifemapData
from pylifemap.utils import (
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    MAX_HOVER_DATA_LEN,
    check_jupyter,
    check_marimo,
    icon_url_to_data_uri,
    is_hex_color,
    is_icon_url,
)
from pylifemap.widget import LifemapWidget


class Lifemap:
    """
    Build visualization.

    Parameters
    ----------
    data : pl.DataFrame | pd.DataFrame | None, optional
        Visualization data.
    taxid_col : str, optional
        Name of the `data` column with taxonomy ids, by default `"taxid"`
    width : int | str, optional
        Lifemap visualization width, in pixels or CSS units, by
        default `DEFAULT_WIDTH`
    height : int | str, optional
        Lifemap visualization height, in pixels or CSS units, by
        default `DEFAULT_HEIGHT`
    zoom : int, optional
        Default Lifemap zoom level, by default 4 or 5 depending on widget size
    theme : str, optional
        Color theme for the basemap. Can be one of "light", "dark", "lightblue", "lightgrey", or "lightgreen".
        Defaults to "dark".
    controls : Sequence[str]
        List of controls to be displayed on the widget. By default all controls are displayed.
        Available controls are:
            - "zoom": zoom in and zoom out buttons
            - "reset_zoom": zoom reset button
            - "png_export": button to export current view to a PNG file
            - "full_screen": full screen toggle button
    legend_width : int | None, optional
        Legend width in pixels, by default None
    hide_labels : bool
        If True, hide the taxa name labels. Defaults to False.

    Examples
    --------
    >>> import polars as pl
    >>> from pylifemap import Lifemap
    >>> d = pl.DataFrame({"taxid": [9685, 9615, 9994]})
    >>> Lifemap(d, width="100%", height="100vh").layer_points().show()

    """

    def __init__(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        width: int | str = DEFAULT_WIDTH,
        height: int | str = DEFAULT_HEIGHT,
        zoom: int | None = None,
        theme: str = "dark",
        controls: Sequence[str] = ("zoom", "reset_zoom", "png_export", "full_screen"),
        legend_width: int | None = None,
        hide_labels: bool = False,
    ) -> None:
        # Init LifemapData object with data
        if data is not None:
            self.data = LifemapData(data, taxid_col=taxid_col)
        else:
            self.data = None

        # Convert width and height to CSS pixels if integers
        self._width = width if isinstance(width, str) else f"{width}px"
        self._height = height if isinstance(height, str) else f"{height}px"

        # Default zoom level
        if zoom is None:
            final_width = re.findall(r"^(\d+)px$", self._width)
            final_height = re.findall(r"^(\d+)px$", self._height)
            if (final_width and int(final_width[0]) < 800) or (final_height and int(final_height[0]) < 800):  # noqa: PLR2004
                zoom = 4
            else:
                zoom = 5

        # Init layers attributes
        self._layers = []
        self._layers_counter = 0
        self._layers_data = {}
        self._color_ranges = {}

        available_themes = ("light", "dark", "lightblue", "lightgrey", "lightgreen")
        if theme not in available_themes:
            msg = f"{theme} is not one of the available themes: {available_themes}"
            raise ValueError(msg)

        # Store global map options
        self._map_options = {
            "zoom": zoom,
            "theme": theme,
            "legend_width": legend_width,
            "controls": controls,
            "hide_labels": hide_labels,
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
            data=self._layers_data,
            layers=self._layers,
            options=self._map_options,
            color_ranges=self._color_ranges,
            width=self._width,
            height=self._height,
        )

    def _process_options(self, options: dict) -> tuple[dict, LifemapData]:
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
        self._layers_counter += 1
        options["id"] = f"layer{self._layers_counter}"
        del options["self"]
        if options["data"] is not None:
            taxid_col = options["taxid_col"] if options["taxid_col"] is not None else "taxid"
            data = LifemapData(options["data"], taxid_col=taxid_col)
        else:
            data = self.data
        if data is None:
            msg = "Layer doesn't have any data"
            raise ValueError(msg)
        return options, data

    def show(self) -> None | LifemapWidget:
        """
        Display the Jupyter widget for this instance.

        In a Jupyter notebook environment, the method uses `IPython.display.display` to
        display the visualization directly. Otherwise, it exports the widget to an HTML
        file and opens it in a browser if possible.

        In a marimo notebook environment, the widget object is returned in order to be
        passed to marimo.ui.anywidget().
        """
        if check_marimo():
            return self._to_widget()
        if check_jupyter():
            display(self._to_widget())
            return
        self._width = "100%"
        self._height = "100vh"
        if os.environ.get("PYLIFEMAP_DOCKER") == "1":
            path = Path("lifemap.html")
            self.save(path)
            print("File saved in lifemap.html")  # noqa: T201
        else:
            with TemporaryDirectory() as tempdir:
                temp_path = Path(tempdir) / "lifemap.html"
                self.save(temp_path)
                webbrowser.open(str(temp_path))
                input("Opening widget in browser, press Enter when finished.\n")

    def save(self, path: str | Path, title: str = "Lifemap") -> None:
        """
        Save the Jupyter widget for this instance to an HTML file.

        Parameters
        ----------
        path : str | Path
            Path to the HTML file to save the widget.
        title : str, optional
            Optional HTML page title, by default "Lifemap"

        Examples
        --------
        >>> import polars as pl
        >>> from pylifemap import Lifemap
        >>> d = pl.DataFrame({"taxid": [9685, 9615, 9994]})
        >>> (
        ...     Lifemap(d, width="100%", height="100vh")
        ...     .layer_points()
        ...     .save("lifemap.html", title="Example lifemap")
        ... )

        """

        w = self._to_widget()

        embed_minimal_html(
            path,
            views=[w],
            state=dependency_state([w], drop_defaults=False),
            drop_defaults=False,
            title=title,
        )

    def layer_points(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        leaves: Literal["show", "only", "omit"] = "show",
        radius: int | float | str = 5,
        radius_range: tuple | list = (2, 30),
        fill: str | None = None,
        fill_cat: bool | None = None,
        scheme: str | None = None,
        opacity: float = 0.8,
        popup: bool = True,
        hover: bool | None = None,
        label: str | None = None,
    ) -> Lifemap:
        """
        Add a points layer.

        It can be used to display leaves values, or aggregated counts or values already
        computed or generated by [](`~pylifemap.aggregate_num`) or
        [](`~pylifemap.aggregate_count`).

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            If `data` is provided, name of the `data` column with taxonomy ids, by default `"taxid"`
        leaves : Literal[&quot;show&quot;, &quot;only&quot;, &quot;omit&quot;], optional
            If `"only"`, only show tree leaves. If `"omit"`, only show nodes that are
            not leaves. If `"show"`, show all nodes, by default "show"
        radius : int | float | str, optional
            If numeric, the fixed radius of the points. If a string, the name of a numerical DataFrame column
            to compute radius width from.
        radius_range : tuple | list
            Range of values for points radius, only used if radius_col is not None, by default (2, 30)
        fill : str | None, optional
            Either the name of a numerical DataFrame column to determine points color, or a fixed CSS
            color for points.
        fill_cat : bool | None, optional
            If True, force color scheme to be categorical. If False, force it to be
            continuous. If None, let pylifemap decide. By default None.
        scheme : str | None, optional
            Color scheme for points color. It is the name of
            an [Observable Plot color scale](https://observablehq.com/plot/features/scales#color-scales).
        opacity : float
            Points opacity as a floating number between 0 and 1, by default 0.8
        popup : bool
            If True, display informations in a popup when a point is clicked,
            by default False
        hover : bool | None, optional
            If True, highlight points on mouse hovering. By default True if less than 10_000 data points,
            False otherwise.
        label : str | None, optional
            Legend title for this layer if `fill` is defined. If `None`, the value
            of `fill` is used.

        Returns
        -------
        Lifemap
            A Lifemap visualization object.

        Raises
        ------
        ValueError
            If leaves is not one of the allowed values.

        Examples
        --------
        >>> import polars as pl
        >>> from pylifemap import Lifemap
        >>> d = pl.DataFrame(
        ...     {
        ...         "taxid": [
        ...             9685,
        ...             9615,
        ...             9994,
        ...             2467430,
        ...             2514524,
        ...             2038938,
        ...             1021470,
        ...             1415565,
        ...             1928562,
        ...             1397240,
        ...             230741,
        ...         ],
        ...         "value": [7.4, 2.5, 8.3, 1.0, 1.4, 5.6, 4.6, 3.4, 2.3, 2.8, 3.1],
        ...     }
        ... )
        >>> Lifemap(d).layer_points(radius="value", fill="value", popup=True).show()


        See also
        --------
        [](`~pylifemap.aggregate_num`) : aggregation of a numeric variable.

        [](`~pylifemap.aggregate_count`) : aggregation of the number of observations.
        """
        options, df = self._process_options(locals())
        leaves_values = ["show", "only", "omit"]
        if options["leaves"] not in leaves_values:
            msg = f"leaves must be one of {leaves_values}"
            raise ValueError(msg)
        if options["hover"] is None:
            options["hover"] = len(df) < MAX_HOVER_DATA_LEN
        layer = {"layer": "points", "options": options}
        self._layers.append(layer)
        data_columns = tuple(
            options[k]
            for k in ("radius", "fill")
            if isinstance(options[k], str) and not is_hex_color(options[k])
        )
        d = df.points_data(options, data_columns)
        self._layers_data[options["id"]] = d
        # Compute color range
        key = options["fill"]
        if key in data_columns:
            min_value = d.get_column(key).min()
            max_value = d.get_column(key).max()
            if key in self._color_ranges:
                self._color_ranges[key]["min"] = min(self._color_ranges[key]["min"], min_value)  # type: ignore
                self._color_ranges[key]["max"] = max(self._color_ranges[key]["max"], max_value)  # type: ignore
            else:
                self._color_ranges[key] = {"min": min_value, "max": max_value}

        return self

    def layer_lines(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        width: int | float | str = 3,
        width_range: tuple | list = (1, 30),
        color: str | None = None,
        scheme: str | None = None,
        opacity: float = 0.8,
        popup: bool = True,
        hover: bool | None = None,
        label: str | None = None,
    ) -> Lifemap:
        """
        Add a lines layer.

        This layer can be applied to data generated by [](`~pylifemap.aggregate_num`)
        or [](`~pylifemap.aggregate_count`).

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            If `data` is provided, name of the `data` column with taxonomy ids, by default `"taxid"`
        width : int | float | str, optional
            If numeric, the fixed width of the lines. If a string, the name of a numerical DataFrame column
            to compute line width from.
        width_range : tuple | list, optional
            Min and max values for line widths, only used if width is a data column, by default (1, 30)
        color : str | None, optional
            Either the name of a numerical DataFrame column to determine line color, or a fixed CSS color for
            lines.
        scheme : str | None, optional
            Color scheme for lines color. It is the name of
            an [Observable Plot color scale](https://observablehq.com/plot/features/scales#color-scales).
        opacity : float
            Line opacity as a floating number between 0 and 1, by default 0.8
        popup : bool
            If True, display informations in a popup when a point is clicked,
            by default False
        hover : bool | None, optional
            If True, highlight points on mouse hovering. By default True if less than 10_000 data points,
            False otherwise.
        label : str | None, optional
            Legend title for this layer if `color` is defined. If `None`, the value
            of `color` is used.

        Returns
        -------
        Lifemap
            A Lifemap visualization object.

        Examples
        --------
        >>> import polars as pl
        >>> from pylifemap import Lifemap, aggregate_num
        >>> d = pl.DataFrame(
        ...     {
        ...         "taxid": [
        ...             9685,
        ...             9615,
        ...             9994,
        ...             2467430,
        ...             2514524,
        ...             2038938,
        ...             1021470,
        ...             1415565,
        ...             1928562,
        ...             1397240,
        ...             230741,
        ...         ],
        ...         "value": [7.4, 2.5, 8.3, 1.0, 1.4, 5.6, 4.6, 3.4, 2.3, 2.8, 3.1],
        ...     }
        ... )
        >>> d = aggregate_num(d, column="value", fn="mean")
        >>> Lifemap(d).layer_lines(width="value", color="value").show()


        See also
        --------
        [](`~pylifemap.aggregate_num`) : aggregation of a numeric variable.

        [](`~pylifemap.aggregate_count`) : aggregation of the number of observations.
        """
        options, df = self._process_options(locals())
        if options["hover"] is None:
            options["hover"] = len(df) < MAX_HOVER_DATA_LEN
        layer = {"layer": "lines", "options": options}
        self._layers.append(layer)
        data_columns = tuple(
            options[k]
            for k in ("width", "color")
            if isinstance(options[k], str) and not is_hex_color(options[k])
        )
        d = df.lines_data(data_columns)
        self._layers_data[options["id"]] = d
        # Compute color range
        key = options["color"]
        if key in data_columns:
            min_value = d.get_column(key).min()
            max_value = d.get_column(key).max()
            if key in self._color_ranges:
                self._color_ranges[key]["min"] = min(self._color_ranges[key]["min"], min_value)  # type: ignore
                self._color_ranges[key]["max"] = max(self._color_ranges[key]["max"], max_value)  # type: ignore
            else:
                self._color_ranges[key] = {"min": min_value, "max": max_value}

        return self

    def layer_donuts(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        counts_col: str,
        radius: int = 40,
        leaves: Literal["show", "hide"] = "hide",
        scheme: str | None = None,
        opacity: float | None = 1,
        popup: bool = True,
        label: str | None = None,
    ) -> Lifemap:
        """
        Add a donuts layer.

        This layer displays the distribution of a categorical variable values among
        each nodes children. Optionally it can also represent leaves values as a
        point layer.

        It should be applied to data computed with [](`~pylifemap.aggregate_freq`).

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            If `data` is provided, name of the `data` column with taxonomy ids, by default `"taxid"`
        counts_col : str
            DataFrame column containing the counts.
        radius : int, optional
            Donut charts radius, by default 40
        leaves : Literal[&quot;show&quot;, &quot;hide&quot;], optional
            If `"show"`, add a points layer with individual leaves values, by
            default "hide"
        scheme : str | None, optional
            Color scheme for donut charts ans points. It is the name of
            a categorical [Observable Plot color scale](https://observablehq.com/plot/features/scales#color-scales),
            by default None
        opacity : float | None, optional
            Donut charts and points opacity, by default 1
        popup : bool, optional
            If True, display informations in a popup when a point is clicked,
            by default True
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

        Examples
        --------
        >>> import polars as pl
        >>> from pylifemap import Lifemap, aggregate_freq
        >>> d = pl.DataFrame(
        ...     {
        ...         "taxid": [
        ...             9685,
        ...             9615,
        ...             9994,
        ...             2467430,
        ...             2514524,
        ...             2038938,
        ...             1021470,
        ...             1415565,
        ...             1928562,
        ...             1397240,
        ...             230741,
        ...         ],
        ...         "category": ["a", "b", "b", "a", "a", "c", "a", "b", "b", "a", "b"],
        ...     }
        ... )
        >>> d = aggregate_freq(d, column="category")
        >>> Lifemap(d).layer_donuts(counts_col="category", leaves="hide").show()


        See also
        --------
        [](c) : aggregation of the values counts of a
        categorical variable.

        """
        options, df = self._process_options(locals())
        leaves_values = ["show", "hide"]
        if options["leaves"] not in leaves_values:
            msg = f"leaves must be one of {leaves_values}"
            raise ValueError(msg)
        options["label"] = counts_col if options["label"] is None else options["label"]
        layer = {"layer": "donuts", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = df.donuts_data(options)

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
            self._layers.append(points_layer)
            points_options["leaves"] = "only"
            self._layers_data[points_id] = df.points_data(points_options)

        return self

    def layer_heatmap(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        radius: float = 5.0,
        blur: float = 5.0,
        opacity: float = 1.0,
        gradient: tuple = (
            "#4675ed",
            "#39a2fc",
            "#1bcfd4",
            "#24eca6",
            "#61fc6c",
            "#a4fc3b",
            "#d1e834",
            "#f3363a",
        ),
    ) -> Lifemap:
        """
        Add an heatmap layer.

        This layer is used to display observations distribution.

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            If `data` is provided, name of the `data` column with taxonomy ids, by default `"taxid"`
        radius : float
            Heatmap radius, by default 5.0
        blur : float
            Heatmap blur, by default 5.0
        opacity : float
            Heatmap opacity as a floating number between 0 and 1, by default 1.0
        gradient: tuple
            Tuple of CSS colors to define the heatmap gradient. By default gradient
            inspired from the "turbo" color ramp.

        Returns
        -------
        Lifemap
            A Lifemap visualization object.

        Examples
        --------
        >>> import polars as pl
        >>> from pylifemap import Lifemap
        >>> d = pl.DataFrame(
        ...     {
        ...         "taxid": [
        ...             9685,
        ...             9615,
        ...             9994,
        ...             2467430,
        ...             2514524,
        ...             2038938,
        ...             1021470,
        ...             1415565,
        ...             1928562,
        ...             1397240,
        ...             230741,
        ...         ],
        ...     }
        ... )
        >>> Lifemap(d).layer_heatmap().show()

        """

        options, df = self._process_options(locals())
        layer = {"layer": "heatmap", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = df.points_data(options)
        return self

    def layer_heatmap_deck(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        radius: float = 30,
        intensity: float = 5,
        threshold: float = 0.05,
        opacity: float = 0.5,
        color_range: list | None = None,
    ) -> Lifemap:
        """
        Add a deck.gl heatmap layer.

        This layer is used to display observations distribution.

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            If `data` is provided, name of the `data` column with taxonomy ids, by default `"taxid"`
        radius : float, optional
            Heatmap radius, by default 30
        intensity : float, optional
            Heatmap intensity, by default 5
        threshold : float, optional
            Heatmap threshold, by default 0.05
        opacity : float, optional
            Heatmap opacity as a floating number between 0 and 1, by default 0.5
        color_range : list | None, optional
            List of colors to define a custom color gradient.


        Returns
        -------
        Lifemap
            A Lifemap visualization object.

        Examples
        --------
        >>> import polars as pl
        >>> from pylifemap import Lifemap
        >>> d = pl.DataFrame(
        ...     {
        ...         "taxid": [
        ...             9685,
        ...             9615,
        ...             9994,
        ...             2467430,
        ...             2514524,
        ...             2038938,
        ...             1021470,
        ...             1415565,
        ...             1928562,
        ...             1397240,
        ...             230741,
        ...         ],
        ...     }
        ... )
        >>> Lifemap(d).layer_heatmap_deck().show()

        """

        options, df = self._process_options(locals())
        layer = {"layer": "heatmap_deck", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = df.points_data()
        return self

    def layer_screengrid(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        cell_size: int = 30,
        extruded: bool = False,
        opacity: float = 0.5,
    ) -> Lifemap:
        """
        Add a screengrid layer.

        This layer is used to display observations distribution. It should be noted
        that the visualization is highly sensitive to the zoom level and the map extent.

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            If `data` is provided, name of the `data` column with taxonomy ids, by default `"taxid"`
        cell_size : int, optional
            Screen grid cell size, in pixels, by default 30
        extruded : bool, optionals
            If True, show the grid as extruded, by default False
        opacity : float, optional
            Screengrid opacity as a floating point number between 0 and 1,
            by default 0.5

        Returns
        -------
        Lifemap
            A Lifemap visualization object.

        Examples
        --------
        >>> import polars as pl
        >>> from pylifemap import Lifemap
        >>> d = pl.DataFrame(
        ...     {
        ...         "taxid": [
        ...             9685,
        ...             9615,
        ...             9994,
        ...             2467430,
        ...             2514524,
        ...             2038938,
        ...             1021470,
        ...             1415565,
        ...             1928562,
        ...             1397240,
        ...             230741,
        ...         ],
        ...     }
        ... )
        >>> Lifemap(d).layer_screengrid().show()

        """
        options, df = self._process_options(locals())
        layer = {"layer": "screengrid", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = df.points_data()
        return self

    def layer_text(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        text: str,
        font_size: int = 12,
        font_family: str = "Segoe UI, Helvetica, sans-serif",
        color: str = "#FFFFFF",
        stroke: str = "#000000",
        opacity: float = 1.0,
    ) -> Lifemap:
        """
        Add a text labels layer.

        It can be used to display text labels alongside species identified by their taxids.

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            If `data` is provided, name of the `data` column with taxonomy ids, by default `"taxid"`
        text : str
            Name of a column of the data containing text to be displayed.
        font_size: int
            Text font size, by default 12.
        font_family : str
            CSS-like font family definition, by default "Segoe UI, Helvetica, sans-serif".
        color : str
            CSS text color specification, by default "#FFFFFF".
        stroke : str
            CSS stroke color specification, by default "#000000".
        opacity : float
            Text opacity as a floating number between 0 and 1, by default 1.0.

        Returns
        -------
        Lifemap
            A Lifemap visualization object.

        Examples
        --------
        >>> import polars as pl
        >>> from pylifemap import Lifemap
        >>> d = pl.DataFrame(
        ...     {
        ...         "taxid": [
        ...             9685,
        ...             9615,
        ...             9994,
        ...             2467430,
        ...             2514524,
        ...             2038938,
        ...             1021470,
        ...             1415565,
        ...             1928562,
        ...             1397240,
        ...             230741,
        ...         ],
        ...         "value": list("ABCDEFGHIJK"),
        ...     }
        ... )
        >>> Lifemap(d).layer_text(text="value", font_size=14).show()

        """
        options, df = self._process_options(locals())
        layer = {"layer": "text", "options": options}
        self._layers.append(layer)
        data_columns = (text,)
        self._layers_data[options["id"]] = df.points_data(options, data_columns)
        return self

    def layer_icons(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        icon: str,
        width: int | None = None,
        height: int | None = None,
        scale: float | None = None,
        color: str | None = None,
        x_offset: int = 0,
        y_offset: int = 0,
        x_anchor: float = 0.5,
        y_anchor: float = 0.5,
        opacity: float = 1.0,
        popup: bool = False,
    ) -> Lifemap:
        """
        Add an icons layer.

        It can be used to display icons associated to taxids.

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            If `data` is provided, name of the `data` column with taxonomy ids, by default `"taxid"`
        icon : str
            Either the URL to an image file or data uri to use as icon, or the name of a column of the data
            containing urls or data uris of icons to be displayed.
        width : int | None, optional
            Image width, in pixels.
        height : int | None, optional
            Image height, in pixels.
        scale : float | None, optional
            Factor with which to scale the original icon size. Cannot be used with width or height.
        color : str | None, optional
            CSS color to tint the icon, by default None.
        x_offset : int
            Horizontal offset in pixels, by default 0.
        y_offset : int
            Vertical offset in pixels, by default 0.
        x_anchor : float
            Horizontal icon anchor, as a number between 0 and 1, by default 0.5.
        y_anchor : float
            Vertical icon anchor, as a number between 0 and 1, by default 0.5.
        opacity : float
            Text opacity as a floating number between 0 and 1, by default 1.0.
        popup : bool, optional
            If True, display informations in a popup when an icon is clicked,
            by default False.


        Returns
        -------
        Lifemap
            A Lifemap visualization object.

        Examples
        --------
        >>> import polars as pl
        >>> from pylifemap import Lifemap
        >>> d = pl.DataFrame(
        ...     {
        ...         "taxid": [
        ...             9685,
        ...             9615,
        ...             9994,
        ...             2467430,
        ...             2514524,
        ...             2038938,
        ...             1021470,
        ...             1415565,
        ...             1928562,
        ...             1397240,
        ...             230741,
        ...         ]
        ...     }
        ... )
        >>> Lifemap(d).layer_icons(icon="https://openlayers.org/en/latest/examples/data/icon.png").show()

        """
        options, df = self._process_options(locals())
        if options["scale"] is not None and (options["width"] is not None or options["height"] is not None):
            msg = "You cannot specify both a 'scale' and  a 'width' or 'height'."
            raise ValueError(msg)

        is_icon_column = isinstance(options["icon"], str) and not is_icon_url(options["icon"])

        data_columns = (options["icon"],) if is_icon_column else ()
        layer_data = df.points_data(options, data_columns)
        self._layers_data[options["id"]] = layer_data

        # Convert icons url to data uri
        if is_icon_url(options["icon"]):
            options["icons_cache"] = {options["icon"]: icon_url_to_data_uri(options["icon"])}
        else:
            # If icon is a data column, build a cache dictionary of urls => data uris
            icon_values = layer_data.get_column(options["icon"]).unique().to_list()

            options["icons_cache"] = {
                uri: icon_url_to_data_uri(uri) for uri in icon_values if uri is not None
            }

        layer = {"layer": "icons", "options": options}
        self._layers.append(layer)

        return self

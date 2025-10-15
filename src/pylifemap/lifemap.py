"""
Main Lifemap object.
"""

from __future__ import annotations

import os
import webbrowser
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Literal

import pandas as pd
import polars as pl
from IPython.display import display
from ipywidgets.embed import embed_minimal_html

from pylifemap.data import LifemapData
from pylifemap.utils import DEFAULT_HEIGHT, DEFAULT_WIDTH, check_jupyter, check_marimo
from pylifemap.widget import LifemapWidget


class Lifemap:
    """
    Build visualization.

    Parameters
    ----------
    data : pl.DataFrame | pd.DataFrame
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
        Default Lifemap zoom level, by default 5
    legend_width : int | None, optional
        Legend width in pixels, by default None

    Examples
    --------
    >>> import polars as pl
    >>> from pylifemap import Lifemap
    >>> d = pl.DataFrame({"taxid": [9685, 9615, 9994]})
    >>> (
    ...     Lifemap(d, width="100%", height="100vh")
    ...     .layer_points()
    ...     .show()
    >>> )

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
        # Init LifemapData object with data
        self.data = LifemapData(data, taxid_col=taxid_col)

        # Convert width and height to CSS pixels if integers
        self._width = width if isinstance(width, str) else f"{width}px"
        self._height = height if isinstance(height, str) else f"{height}px"

        # Init layers attributes
        self._layers = []
        self._layers_counter = 0
        self._layers_data = {}

        # Store global map options
        self._map_options = {
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
            data=self._layers_data,
            layers=self._layers,
            options=self._map_options,
            width=self._width,
            height=self._height,
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
        self._layers_counter += 1
        options["id"] = f"layer{self._layers_counter}"
        del options["self"]
        return options

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
                input("Press Enter when finished.\n")

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
        embed_minimal_html(path, views=[self._to_widget()], drop_defaults=False, title=title)

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
        Add a Deck.gl points layer.

        It can be used to display leaves values, or aggregated counts or values already
        computed or generated by [](`~pylifemap.aggregate_num`) or
        [](`~pylifemap.aggregate_count`).

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
            If True, force color scheme to be categorical. If False, force it to be
            continuous. If None, let pylifemap decide, by default None
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
        >>> (Lifemap(d).layer_points(radius_col="value", fill_col="value", popup=True).show())


        See also
        --------
        [](`~pylifemap.aggregate_num`) : aggregation of a numeric variable.

        [](`~pylifemap.aggregate_count`) : aggregation of the number of observations.
        """
        options = self._process_options(locals())
        leaves_values = ["show", "only", "omit"]
        if options["leaves"] not in leaves_values:
            msg = f"leaves must be one of {leaves_values}"
            raise ValueError(msg)
        layer = {"layer": "points", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = self.data.points_data(options)
        return self

    def layer_points_ol(
        self,
        *,
        leaves: Literal["show", "only", "omit"] = "show",
        radius: float = 5,
        radius_col: str | None = None,
        radius_range: tuple | list = (1, 20),
        fill_col: str | None = None,
        fill_col_cat: bool | None = None,
        scheme: str | None = None,
        opacity: float = 0.8,
        popup: bool = False,
        hover: bool = False,
        label: str | None = None,
    ) -> Lifemap:
        """
        Add an Open Layers points layer.

        It can be used to display leaves values, or aggregated counts or values already
        computed or generated by [](`~pylifemap.aggregate_num`) or
        [](`~pylifemap.aggregate_count`).

        Parameters
        ----------
        leaves : Literal[&quot;show&quot;, &quot;only&quot;, &quot;omit&quot;], optional
            If `"only"`, only show tree leaves. If `"omit"`, only show nodes that are
            not leaves. If `"show"`, show all nodes, by default "show"
        radius : float
            Points radius, by default 5. Not used if radius_col is not None
        radius_col : str | None, optional
            Name of a numeric DataFrame column to compute points radius, by default None
        radius_range : tuple | list
            Range of values for points radius, only used if radius_col is not None, by default (1, 20)
        fill_col : str | None, optional
            Name of a DataFrame column to determine points color, by default None
        fill_col_cat : bool | None, optional
            If True, force color scheme to be categorical. If False, force it to be
            continuous. If None, let pylifemap decide. By default None.
        scheme : str | None, optional
            Color scheme for points color. If `fill_col` is defined, it is the name of
            an [Observable Plot color scale](https://observablehq.com/plot/features/scales#color-scales).
            Otherwise, it is an hexadecimal color value. By default None
        opacity : float
            Points opacity as a floating number between 0 and 1, by default 0.8
        popup : bool
            If True, display informations in a popup when a point is clicked,
            by default False
        hover : bool
            If True, highlight points on mouse hovering. By default False.
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
        >>> (Lifemap(d).layer_points_ol(radius_col="value", fill_col="value", popup=True).show())


        See also
        --------
        [](`~pylifemap.aggregate_num`) : aggregation of a numeric variable.

        [](`~pylifemap.aggregate_count`) : aggregation of the number of observations.
        """
        options = self._process_options(locals())
        leaves_values = ["show", "only", "omit"]
        if options["leaves"] not in leaves_values:
            msg = f"leaves must be one of {leaves_values}"
            raise ValueError(msg)
        layer = {"layer": "points_ol", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = self.data.points_data(options)
        return self

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
        each nodes children. Optionally it can also represent leaves values as a
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
        >>> (Lifemap(d).layer_donuts(counts_col="category", leaves="hide").show())


        See also
        --------
        [](c) : aggregation of the values counts of a
        categorical variable.

        """
        options = self._process_options(locals())
        leaves_values = ["show", "hide"]
        if options["leaves"] not in leaves_values:
            msg = f"leaves must be one of {leaves_values}"
            raise ValueError(msg)
        options["label"] = counts_col if options["label"] is None else options["label"]
        layer = {"layer": "donuts", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = self.data.donuts_data(options)

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
            self._layers_data[points_id] = self.data.points_data(points_options)

        return self

    def layer_heatmap_ol(
        self,
        *,
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
        Add an Open Layers heatmap layer.

        This layer is used to display observations distribution.

        Parameters
        ----------
        radius : float
            Heatmap radius, by default 5.0
        blur : float
            Heatmap blur, by default 5.O
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
        >>> (Lifemap(d).layer_heatmap_ol().show())

        """

        options = self._process_options(locals())
        layer = {"layer": "heatmap_ol", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = self.data.points_data(options)
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
        """
        Add a lines layer.

        This layer can be applied to data generated by [](`~pylifemap.aggregate_num`)
        or [](`~pylifemap.aggregate_count`).

        Parameters
        ----------
        width : float | None, optional
            Base line width, by default None
        width_col : str | None, optional
            Name of numeric DataFrame column to compute line width, by default None
        color_col : str | None, optional
            Name of numeric DataFrame column to determine line color, by default None
        scheme : str | None, optional
            Color scheme for points color. If `color_col` is defined, it is the name of
            an [Observable Plot color scale](https://observablehq.com/plot/features/scales#color-scales).
            Otherwise, it is an hexadecimal color value, by default None
        opacity : float | None, optional
            Line opacity as a floating number between 0 and 1, by default 0.8
        popup : bool | None, optional
            TODO: doesn't work for the moment.
            If True, display informations in a popup when a point is clicked,
            by default False
        label : str | None, optional
            Legend title for this layer if `color_col` is defined. If `None`, the value
            of `color_col` is used.

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
        >>> (Lifemap(d).layer_lines(width_col="value", color_col="value").show())


        See also
        --------
        [](`~pylifemap.aggregate_num`) : aggregation of a numeric variable.

        [](`~pylifemap.aggregate_count`) : aggregation of the number of observations.
        """
        options = self._process_options(locals())
        layer = {"layer": "lines", "options": options}
        self._layers.append(layer)
        if color_col is not None:
            options["scale_extent"] = [
                self.data.data.get_column(color_col).min(),
                self.data.data.get_column(color_col).max(),
            ]
        self._layers_data[options["id"]] = self.data.lines_data(options)
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
        """
        Add a heatmap layer.

        This layer is used to display observations distribution.

        Parameters
        ----------
        radius : float, optional
            Heatmap radius, by default 30
        intensity : float, optional
            Heatmap intensity, by default 5
        threshold : float, optional
            Heatmap threshold, by default 0.05
        opacity : float, optional
            Heatmap opacity as a floating number between 0 and 1, by default 0.5

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
        >>> (Lifemap(d).layer_heatmap().show())

        """

        options = self._process_options(locals())
        layer = {"layer": "heatmap", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = self.data.points_data()
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
        """
        Add a screengrid layer.

        This layer is used to display observations distribution. It should be noted
        that the visualization is highly sensitive to the zoom level and the map extent.

        Parameters
        ----------
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
        >>> (Lifemap(d).layer_screengrid().show())

        """
        options = self._process_options(locals())
        layer = {"layer": "screengrid", "options": options}
        self._layers.append(layer)
        self._layers_data[options["id"]] = self.data.points_data()
        return self

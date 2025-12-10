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

from pylifemap.data.lifemap_data import LifemapData
from pylifemap.layers.layer_donuts import LayerDonuts
from pylifemap.layers.layer_heatmap import LayerHeatmap
from pylifemap.layers.layer_heatmap_deck import LayerHeatmapDeck
from pylifemap.layers.layer_icons import LayerIcons
from pylifemap.layers.layer_lines import LayerLines
from pylifemap.layers.layer_points import LayerPoints
from pylifemap.layers.layer_screengrid import LayerScreengrid
from pylifemap.layers.layer_text import LayerText
from pylifemap.utils import (
    DEFAULT_HEIGHT,
    DEFAULT_WIDTH,
    check_jupyter,
    check_marimo,
)
from pylifemap.widget import LifemapWidget, LifemapWidgetDeck, LifemapWidgetNoDeck


class Lifemap(
    LayerIcons,
    LayerText,
    LayerScreengrid,
    LayerPoints,
    LayerLines,
    LayerDonuts,
    LayerHeatmap,
    LayerHeatmapDeck,
):
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
    center : Literal["default", "auto"] | int
        Lifemap initial center. Can be "default" (tree center), "auto" (center on data) or
        a taxid value. Defaults to "default".
    zoom : int | None, optional
        Lifemap initial zoom level, if not specified, it is computed depending on the "center"
        argument value. Defaults to None.
    theme : str, optional
        Color theme for the basemap. Can be one of "light", "dark", "lightblue", "lightgrey", or "lightgreen".
        Defaults to "dark".
    controls : Sequence[str]
        List of controls to be displayed on the widget. By default all controls are displayed.
        Available controls are:
            - "zoom": zoom in and zoom out buttons
            - "reset_zoom": zoom reset button
            - "png_export": button to export current view to a PNG file
            - "search": taxa search button
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
        center: Literal["default", "auto"] | int = "default",
        zoom: int | None = None,
        theme: str = "dark",
        controls: Sequence[str] = ("zoom", "reset_zoom", "png_export", "search", "full_screen"),
        legend_width: int | None = None,
        hide_labels: bool = False,
    ) -> None:
        super().__init__()

        # Init LifemapData object with data
        if data is not None:
            self.data = LifemapData(data, taxid_col=taxid_col)
        else:
            self.data = None

        # Convert width and height to CSS pixels if integers
        self._width = width if isinstance(width, str) else f"{width}px"
        self._height = height if isinstance(height, str) else f"{height}px"

        # Default zoom level
        if center == "default" and zoom is None:
            final_width = re.findall(r"^(\d+)px$", self._width)
            final_height = re.findall(r"^(\d+)px$", self._height)
            if (final_width and int(final_width[0]) < 800) or (final_height and int(final_height[0]) < 800):  # noqa: PLR2004
                zoom = 4
            else:
                zoom = 5

        available_themes = ("light", "dark", "lightblue", "lightgrey", "lightgreen")
        if theme not in available_themes:
            msg = f"{theme} is not one of the available themes: {available_themes}"
            raise ValueError(msg)

        # Store global map options
        self._map_options = {
            "center": center,
            "zoom": zoom,
            "theme": theme,
            "legend_width": legend_width,
            "controls": controls,
            "hide_labels": hide_labels,
        }

        self._has_deck_layers = False

    def __repr__(self) -> str:
        # Override default __repr__ to avoid very long and slow text output
        if self._has_deck_layers:
            return "<LifemapWidget with deck.gl>"
        else:
            return "<LifemapWidget without deck.gl>"

    def _to_widget(self) -> LifemapWidget:
        """
        Convert current instance to a Jupyter Widget.

        Returns
        -------
        LifemapWidget
            An Anywidget widget.
        """

        if self._has_deck_layers:
            widget_class = LifemapWidgetDeck
        else:
            widget_class = LifemapWidgetNoDeck

        return widget_class(
            data=self._layers_data,
            layers=self._layers,
            options=self._map_options,
            color_ranges=self._color_ranges,
            width=self._width,
            height=self._height,
        )

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

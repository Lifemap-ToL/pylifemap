from typing import Literal

import pandas as pd
import polars as pl

from pylifemap.layers.base import LayersBase


class LayerText(LayersBase):
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
        declutter: bool = True,
        lazy: bool = False,
        lazy_zoom: int = 15,
        lazy_mode: Literal["self", "parent"] = "self",
    ) -> LayersBase:
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
        declutter : bool, optional
            If True, use OpenLayers decluttering option for this layer. Defaults to True.
        lazy : bool
            If True, points are displayed depending on the widget view. If False, all points are displayed.
            Can be useful when displaying a great number of items. Defaults to False.
        lazy_zoom : int
            If lazy true, only points with a zoom level less than (zoom + lazy_zoom) level will be
            displayed. Defaults to 15.
        lazy_mode : Literal["self", "parent"], optional
            If lazy is True, choose the zoom level to apply to each taxa. If "self", keep the taxa zoom
            level. If "parent", get the nearest ancestor zoom level. Defaults to "self".



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
        d = df.points_data(options, data_columns, lazy_mode=lazy_mode)
        self._layers_data[options["id"]] = d

        return self

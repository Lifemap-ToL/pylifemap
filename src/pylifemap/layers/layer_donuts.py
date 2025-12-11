from typing import Literal

import pandas as pd
import polars as pl

from pylifemap.layers.base import LayersBase


class LayerDonuts(LayersBase):
    def layer_donuts(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        counts_col: str,
        categories: list | tuple | None = None,
        radius: int | list[int] | tuple[int] = 50,
        leaves: Literal["show", "hide"] = "hide",
        show_totals: bool = True,
        scheme: str | None = None,
        opacity: float | None = 1,
        popup: bool = True,
        popup_col: str | None = None,
        label: str | None = None,
        declutter: bool = True,
        lazy: bool = True,
        lazy_zoom: int = 4,
    ) -> LayersBase:
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
        categories : list | tuple | None, optional
            Custom order of categories. Defaults to None.
        radius : int | list | tuple, optional
            Donut charts radius. If an integer, all donut charts will be of the same size. If a list
            or a tuple of length 2, chart size will depend on the node total count. By default 50
        leaves : Literal[&quot;show&quot;, &quot;hide&quot;], optional
            If `"show"`, add a points layer with individual leaves values, by
            default "hide"
        show_totals : bool, optional
            If True, display the total count of the current taxa in the center of the donut chart. Defaults to
            True
        scheme : str | None, optional
            Color scheme for donut charts ans points. It is the name of
            a categorical [Observable Plot color scale](https://observablehq.com/plot/features/scales#color-scales),
            by default None
        opacity : float | None, optional
            Donut charts and points opacity, by default 1
        popup : bool, optional
            If True, display informations in a popup when a point is clicked,
            by default True
        popup_col : str | None
            Name of a data column containing custom popup content. By default None.
        label : str | None, optional
            Legend title for this layer. If `None`, the value of `counts_col` is used.
        declutter : bool, optional
            If True, use OpenLayers decluttering option for this layer. Defaults to True.
        lazy : bool
            If True, points are displayed depending on the widget view. If False, all points are displayed.
            Can be useful when displaying a great number of items. Defaults to True.
        lazy_zoom : int
            If lazy true, only points with a zoom level less than (zoom + lazy_zoom) level will be
            displayed. Defaults to 4.


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
        data_columns = (options["popup_col"],) if popup_col is not None else ()
        self._layers_data[options["id"]] = df.donuts_data(options, data_columns=data_columns)

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

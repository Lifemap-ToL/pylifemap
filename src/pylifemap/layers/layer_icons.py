import pandas as pd
import polars as pl

from pylifemap.layers.base import LayersBase
from pylifemap.utils import icon_url_to_data_uri, is_icon_url


class LayerIcons(LayersBase):
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
    ) -> LayersBase:
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

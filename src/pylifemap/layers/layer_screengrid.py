import pandas as pd
import polars as pl

from pylifemap.layers.base import LayersBase


class LayerScreengrid(LayersBase):
    def layer_screengrid(
        self,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        cell_size: int = 30,
        extruded: bool = False,
        opacity: float = 0.5,
    ) -> LayersBase:
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
        self._has_deck_layers = True
        return self

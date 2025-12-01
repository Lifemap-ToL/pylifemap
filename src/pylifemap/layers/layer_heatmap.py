import pandas as pd
import polars as pl

from pylifemap.layers.base import LayersBase


class LayerHeatmap(LayersBase):
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
    ) -> LayersBase:
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

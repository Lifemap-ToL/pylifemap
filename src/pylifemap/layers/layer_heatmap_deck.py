import pandas as pd
import polars as pl

from pylifemap.layers.base import LayersBase


class LayerHeatmapDeck(LayersBase):
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
    ) -> LayersBase:
        """
        Add a deck.gl heatmap layer.

        This layer is used to display observations distribution.

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            If `data` is provided, name of the `data` column with taxonomy ids. By default `'taxid'`.
        radius : float, optional
            Heatmap radius. By default 30.
        intensity : float, optional
            Heatmap intensity. By default 5.
        threshold : float, optional
            Heatmap threshold. By default 0.05.
        opacity : float, optional
            Heatmap opacity as a floating number between 0 and 1. By default 0.5.
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

        layer_id, options, df = self._process_options(locals())
        layer = {"id": layer_id, "layer": "heatmap_deck", "options": options}
        self._layers.append(layer)
        self._layers_data[layer_id] = df.points_data(options)
        self._has_deck_layers = True
        return self

from collections.abc import Sequence

import pandas as pd
import polars as pl

from pylifemap.abc import LifemapABC
from pylifemap.utils import is_hex_color


class ArcsDeckMixin:
    def layer_arcs_deck(
        self: LifemapABC,
        data: pl.DataFrame | pd.DataFrame | None = None,
        *,
        taxid_col: str = "taxid",
        taxid_dest_col: str,
        width: int | float = 3,
        width_range: Sequence = (1, 20),
        source_color: Sequence = (255, 0, 0, 255),
        dest_color: Sequence = (255, 255, 0, 255),
        height: float = 0.2,
        tilt: int = 15,
        n_segments: int = 100,
        opacity: float = 0.8,
    ) -> LifemapABC:
        """
        Add an arcs layer.

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame | None, optional
            Layer data. If not provided, use the base widget data.
        taxid_col : str, optional
            Name of the data column with arc start taxonomy ids. By default `'taxid'`.
        taxid_dest_col : str, optional
            Name of the data column with arc end taxonomy ids.
        width : int | float | str, optional
            If numeric, the fixed width of the arcs. If a string, the name of a numerical DataFrame column
            to compute arc width from. By default 3.
        width_range : tuple | list, optional
            Min and max values for arcs widths, only used if `width` is a data column. By default (1, 30).
        source_color : Sequence, optional
            Array of 4 numbers between 0 and 255 defining the start of arc color
            ([red, green, blue, opacity]). By default (255, 0, 0, 255).
        dest_color : Sequence, optional
            Array of 4 numbers between 0 and 255 defining the end of arc color
            ([red, green, blue, opacity]). By default (255, 255, 0, 255).
        height: float, optional
            Arcs height. By default 0.2.
        tilt: int, optional
            Tilt angle for arcs with same source and destination. By default 15.
        n_segments: int, optional
            Number of segments per arc. A bigger number gives smoother results but can be slower to render.
            By default 100.
        opacity : float
            Arc opacity as a floating number between 0 and 1. By default 0.8.
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
        ...         "dest_taxid": [
        ...             9615,
        ...             1415565,
        ...             2467430,
        ...             9994,
        ...             9685,
        ...             2514524,
        ...             2038938,
        ...             1397240,
        ...             1021470,
        ...             1928562,
        ...             230741,
        ...         ],
        ...     }
        ... )
        Lifemap(d).layer_arcs_deck(taxid_dest_col="dest_taxid").show()

        """
        layer_id, options, df = self._process_layer_options(locals())

        layer = {"id": layer_id, "layer": "arcs_deck", "options": options}
        self._layers.append(layer)

        data_columns = [
            options[k] for k in ("width",) if isinstance(options[k], str) and not is_hex_color(options[k])
        ]
        d = df.arcs_data(options, data_columns)
        self._layers_data[layer_id] = d
        self._has_deck_layers = True

        return self

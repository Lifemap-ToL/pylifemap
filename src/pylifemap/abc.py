from abc import ABC, abstractmethod
from pathlib import Path

import pandas as pd
import polars as pl

from pylifemap.data.lifemap_data import LifemapData
from pylifemap.widget import LifemapWidget


class LifemapABC(ABC):
    def __init__(self, data: pl.DataFrame | pd.DataFrame | None = None, taxid_col: str = "taxid"):
        # Init LifemapData object with data
        if data is not None:
            self.data = LifemapData(data, taxid_col=taxid_col)
        else:
            self.data = None

        self._layers_counter = 0
        self._layers = []
        self._layers_data = {}
        self._color_ranges = {}
        self._has_deck_layers = False

    def __repr__(self) -> str:
        # Override default __repr__ to avoid very long and slow text output
        if self._has_deck_layers:
            return "<LifemapWidget with deck.gl>"
        else:
            return "<LifemapWidget without deck.gl>"

    def _process_layer_options(self, options: dict) -> tuple[str, dict, LifemapData]:
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
        layer_id = f"layer{self._layers_counter}"
        del options["self"]
        if options["data"] is not None:
            taxid_col = options["taxid_col"] if options["taxid_col"] is not None else "taxid"
            data = LifemapData(options["data"], taxid_col=taxid_col)
            del options["data"]
        else:
            data = self.data
        if data is None:
            msg = "Layer doesn't have any data"
            raise ValueError(msg)
        return layer_id, options, data

    @abstractmethod
    def show(self) -> None | LifemapWidget: ...

    @abstractmethod
    def save(self, path: str | Path, title: str = "Lifemap") -> None: ...

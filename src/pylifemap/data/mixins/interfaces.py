from typing import Protocol

import polars as pl


class DataMixin(Protocol):
    _data: pl.DataFrame

    def data_with_parents(self) -> pl.DataFrame: ...

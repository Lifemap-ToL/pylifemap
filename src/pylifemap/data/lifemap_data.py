"""
Handling of Lifemap objects data.
"""

import warnings

import pandas as pd
import polars as pl

from pylifemap.data.backend_data import BACKEND_DATA
from pylifemap.data.mixins.donuts import DonutsDataMixin
from pylifemap.data.mixins.lines import LinesDataMixin
from pylifemap.data.mixins.points import PointsDataMixin
from pylifemap.utils import TAXID_COL

# Custom warning message formatting. We use warnings.warn() to display warnings
# in order to be able to filter them in quarto.
warnings.formatwarning = lambda msg, *args, **kwargs: f"Warning: {msg}.\n"  # type: ignore  # noqa: ARG005


class LifemapData(PointsDataMixin, DonutsDataMixin, LinesDataMixin):
    """
    LifemapData class.

    The aim of this class is to store data associated to a Lifemap object and provide
    computation methods.
    """

    def __init__(
        self,
        data: pl.DataFrame | pd.DataFrame,
        *,
        taxid_col: str = "taxid",
        check_taxids: bool = True,
    ):
        """
        LifemapData constructor.

        Parameters
        ----------
        data : pl.DataFrame | pd.DataFrame
            Pandas or polars dataframe with original data.
        taxid_col : str
            Name of the column storing taxonomy ids. By default `'taxid'`.
        check_taxids : bool
            Wether to check or not for missing and duplicated taxids. Defaults to `True`.

        Raises
        ------
        TypeError
            If `data` is not a polars or pandas DataFrame.
        ValueError
            If `taxid_col` is not a column of `data`.
        """

        # Check data type
        if not isinstance(data, pd.DataFrame) and not isinstance(data, pl.DataFrame):
            msg = "data must be a polars or pandas DataFrame."
            raise TypeError(msg)

        # Convert pandas to polars
        categories = {}
        if isinstance(data, pd.DataFrame):
            categorical_cols = data.select_dtypes(include=["category"]).columns
            categories = {col: data[col].cat.categories for col in categorical_cols}
            data = pl.from_pandas(data)

        # Check if taxid_col exists
        if taxid_col not in data.columns:
            msg = f"{taxid_col} is not a column of data."
            raise ValueError(msg)

        data = data.with_columns(pl.col(taxid_col).alias(TAXID_COL))

        # Convert taxid column to Int32 for join compatibility with lmdata
        data = data.with_columns(pl.col(TAXID_COL).cast(pl.Int32))

        # Store data as attribute
        self._data = data
        # Store pandas categories
        self._categories = categories

        # Check for unknown or duplicated taxids
        if check_taxids:
            self.check_unknown_taxids()
            self.check_duplicated_taxids()

    def __len__(self) -> int:
        return self._data.height

    @property
    def data(self) -> pl.DataFrame:
        """
        data property.

        Returns
        -------
        pl.DataFrame
            Object data attribute as polars DataFrame.
        """
        return self._data

    def get_unknown_taxids(self) -> list:
        """
        Check and returns a list of taxids in user data not found in
        Lifemap data.

        Returns
        -------
        list
            Missing taxids
        """
        lmdata = BACKEND_DATA.select("taxid")
        data = self._data.select(TAXID_COL)
        unknown_ids = data.join(lmdata, how="anti", left_on=TAXID_COL, right_on="taxid")
        return unknown_ids.get_column(TAXID_COL).to_list()

    def check_unknown_taxids(self, limit: int = 10) -> None:
        """
        Check and display a warning if taxids in user data are not found in
        Lifemap data.

        Parameters
        ----------
        limit : int
            Maximum number of taxids to print.
        """
        unknown_ids = self.get_unknown_taxids()
        if (n := len(unknown_ids)) > 0:
            msg = f"{n} taxids have not been found in Lifemap database"
            if n < limit:
                msg = msg + f": {unknown_ids}"
            warnings.warn(msg, stacklevel=0)

    def get_duplicated_taxids(self) -> list:
        """
        Check and returns a list of duplicated taxids in user data.

        Returns
        -------
        list
            Duplicated taxids
        """
        taxids = self._data.get_column(TAXID_COL)
        duplicates = taxids.filter(taxids.is_duplicated()).unique()
        return duplicates.to_list()

    def check_duplicated_taxids(self, limit: int = 10) -> None:
        """
        Check and display a warning if their are duplicated taxids in user data.

        Parameters
        ----------
        limit : int
            Maximum number of taxids to print.
        """
        duplicates = self.get_duplicated_taxids()
        if (n := len(duplicates)) > 0:
            msg = f"{n} duplicated taxids have been found in the data"
            if n < limit:
                msg = msg + f": {duplicates}"
            warnings.warn(msg, stacklevel=0)

    def data_with_parents(self) -> pl.DataFrame:
        """
        Returns data with joined `pylifemap_parent` column.

        Returns
        -------
        pl.DataFrame
            Polars DataFrame with `pylifemap_parent` added column.
        """
        data = self._data
        if "pylifemap_parent" not in data.columns:
            lmdata = BACKEND_DATA.select(["taxid", "pylifemap_parent"])
            data = data.join(lmdata, how="inner", left_on=TAXID_COL, right_on="taxid")
        return data

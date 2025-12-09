"""
Handling of Lifemap objects data.
"""

import warnings
from typing import Literal

import pandas as pd
import polars as pl

from pylifemap.data.backend_data import BACKEND_DATA
from pylifemap.data.lazy_loading import propagate_parent_zoom

# Custom warning message formatting. We use warnings.warn() to display warnings
# in order to be able to filter them in quarto.
warnings.formatwarning = lambda msg, *args, **kwargs: f"Warning: {msg}.\n"  # type: ignore  # noqa: ARG005

TAXID_COL = "pylifemap_taxid"


class LifemapData:
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
            Name of the column storing taxonomy ids, by default "taxid".
        check_taxids : bool
            Wether to check or not for missing and duplicated taxids. Defaults to True.

        Raises
        ------
        TypeError
            If data is not a polars or pandas DataFrame.
        ValueError
            If taxid_col is not a column of data.
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

    def points_data(
        self,
        options: dict | None = None,
        data_columns: tuple | list = (),
        lazy_mode: Literal["self", "parent"] = "self",
    ) -> pl.DataFrame:
        """
        Generate data for a points layer.

        Parameters
        ----------
        options : dict | None, optional
            Options dictionary, by default None.
        data_columns: tuple | list, optional
            Data columns to keep in output data, by default ().
        lazy_mode : Literal["self", "parent"], optional
            Lazy loading mode. If "parent", get the nearest ancestor zoom level.
            Defaults to "self".


        Returns
        -------
        pl.DataFrame
            DataFrame with generated data.

        Raises
        ------
        ValueError
            If `options["leaves"]` value is not allowed.
        ValueError
            If `data_columns` columns are not in data.

        """

        needed_cols = [TAXID_COL, "pylifemap_x", "pylifemap_y", "pylifemap_zoom"]
        data = self._data

        leaves = options["leaves"] if options is not None and "leaves" in options else "show"
        leaves_values = ["show", "only", "omit"]
        if leaves not in leaves_values:
            msg = f"leaves must be one of {leaves_values}"
            raise ValueError(msg)

        if leaves in ["only", "omit"]:
            # If leaves is "only", filter non-leaves
            keep_expr = pl.col("pylifemap_leaf")
            if leaves == "omit":
                # If leaves is "omit", remove them
                keep_expr = keep_expr.not_()
            to_keep = BACKEND_DATA.select(["taxid", "pylifemap_leaf"]).filter(keep_expr)
            data = data.join(
                to_keep,
                how="inner",
                left_on=TAXID_COL,
                right_on="taxid",
            )

        # Add needed lifemap tree data
        data = data.join(
            BACKEND_DATA.select(["taxid", "pylifemap_x", "pylifemap_y", "pylifemap_zoom"]),
            how="inner",
            left_on=TAXID_COL,
            right_on="taxid",
        ).sort("pylifemap_zoom", descending=True)

        # Check and add data columns to needed columns if they are defined
        for col in data_columns:
            if col not in data.columns:
                msg = f"{col} must be a column of data."
                raise ValueError(msg)
            needed_cols.append(col)

        # Only keep needed columns
        data = data.select(set(needed_cols))

        if lazy_mode == "parent":
            data = propagate_parent_zoom(data)

        return data

    def donuts_data(self, options: dict, data_columns: tuple | list = ()) -> pl.DataFrame:
        """
        Generate data for a donuts layer.

        Parameters
        ----------
        options : dict
            Options dictionary.
        data_columns: tuple | list, optional
            Data columns to keep in output data, by default ().


        Returns
        -------
        pl.DataFrame
            DataFrame with generated data.
        """

        counts_col = options["counts_col"]
        total_col = "pylifemap_total"

        needed_cols = [
            TAXID_COL,
            total_col,
            "pylifemap_x",
            "pylifemap_y",
            "pylifemap_zoom",
            counts_col,
        ]
        data = self._data

        if counts_col not in data.columns:
            msg = f"f{counts_col} must be a column of data."
            raise ValueError(msg)

        # Remove leaves
        keep_expr = pl.col("pylifemap_leaf").not_()
        to_keep = BACKEND_DATA.select(["taxid", "pylifemap_leaf"]).filter(keep_expr)
        data = data.join(
            to_keep,
            how="inner",
            left_on=TAXID_COL,
            right_on="taxid",
        )

        # Get variable levels
        levels = data.get_column(counts_col).unique().sort()

        # Store frequencies as a pl.Struct and encode as JSON
        data = data.pivot(index=TAXID_COL, on=counts_col, values="count").fill_null(0)
        data = data.with_columns(
            pl.struct(pl.col(levels)).struct.json_encode().alias(counts_col),
            pl.sum_horizontal(pl.col(levels)).alias(total_col),
        ).select(pl.all().exclude(levels))

        # Add needed lifemap tree data
        data = data.join(
            BACKEND_DATA.select(["taxid", "pylifemap_x", "pylifemap_y", "pylifemap_zoom"]),
            how="inner",
            left_on=TAXID_COL,
            right_on="taxid",
        ).select(set(needed_cols))

        # Add back needed data columns from original data
        needed_data_cols = []
        for col in data_columns:
            if col not in self._data.columns:
                msg = f"{col} must be a column of data."
                raise ValueError(msg)
            needed_data_cols.append(col)
        data = data.join(self._data.select([TAXID_COL, *needed_data_cols]).unique(), how="left", on=TAXID_COL)

        return data

    def lines_data(
        self,
        data_columns: tuple | list = (),
        lazy_mode: Literal["self", "parent"] = "self",
    ) -> pl.DataFrame:
        """
        Generate data for a lines layer.

        Parameters
        ----------
        data_columns : tuple | list, optional
            List of data columns to add to output, by default ()
        lazy_mode : Literal["self", "parent"], optional
            Lazy loading mode. If "parent", get the nearest ancestor zoom level.
            Defaults to "self".


        Returns
        -------
        pl.DataFrame
            DataFrame with generated data.
        """
        # Add ancestors info to data
        data = self.data_with_parents()

        # Get points coordinates as x0 and y0 and sort by zoom level
        data = data.join(
            BACKEND_DATA.select(
                pl.col("taxid"),
                pl.col("pylifemap_x").alias("pylifemap_x0"),
                pl.col("pylifemap_y").alias("pylifemap_y0"),
                pl.col("pylifemap_zoom"),
            ),
            how="inner",
            left_on=TAXID_COL,
            right_on="taxid",
        ).sort("pylifemap_zoom", descending=True)

        # Get parent point coordinates as x1 and y1
        data = data.join(
            BACKEND_DATA.select(
                pl.col("taxid"),
                pl.col("pylifemap_x").alias("pylifemap_x1"),
                pl.col("pylifemap_y").alias("pylifemap_y1"),
            ),
            left_on="pylifemap_parent",
            right_on="taxid",
            how="left",
        ).filter((pl.col("pylifemap_x1").is_not_null()) & (pl.col("pylifemap_y1").is_not_null()))

        needed_cols = [
            TAXID_COL,
            "pylifemap_x0",
            "pylifemap_y0",
            "pylifemap_parent",
            "pylifemap_x1",
            "pylifemap_y1",
            "pylifemap_zoom",
        ]

        # Check and add data columns to needed columns if they are defined
        for col in data_columns:
            if col not in data.columns:
                msg = f"{col} must be a column of data."
                raise ValueError(msg)
            needed_cols.append(col)

        # Only keep needed columns
        data = data.select(set(needed_cols))

        if lazy_mode == "parent":
            data = propagate_parent_zoom(data)

        return data

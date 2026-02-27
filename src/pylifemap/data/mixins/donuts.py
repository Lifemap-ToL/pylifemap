"""
Handling of Lifemap objects data.
"""

import polars as pl

from pylifemap.data.backend_data import BACKEND_DATA
from pylifemap.data.geo import project_to_3857
from pylifemap.data.mixins.interfaces import DataMixin
from pylifemap.utils import TAXID_COL


class DonutsDataMixin:
    def donuts_data(self: DataMixin, options: dict, data_columns: tuple | list = ()) -> pl.DataFrame:
        """
        Generate data for a donuts layer.

        Parameters
        ----------
        options : dict
            Options dictionary.
        data_columns: tuple | list, optional
            Data columns to keep in output data. By default `()`.


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
            pl.struct(pl.col(levels)).alias(counts_col),
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

        data = project_to_3857(data, x_col="pylifemap_x", y_col="pylifemap_y")

        return data

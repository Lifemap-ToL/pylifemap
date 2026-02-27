"""
Handling of Lifemap objects data.
"""

from typing import Literal

import polars as pl

from pylifemap.data.backend_data import BACKEND_DATA
from pylifemap.data.geo import project_to_3857
from pylifemap.data.lazy_loading import propagate_parent_zoom
from pylifemap.data.mixins.interfaces import DataMixin
from pylifemap.utils import TAXID_COL


class PointsDataMixin:
    def points_data(
        self: DataMixin,
        options: dict,
        data_columns: tuple | list = (),
        lazy_mode: Literal["self", "parent"] = "self",
    ) -> pl.DataFrame:
        """
        Generate data for a points layer.

        Parameters
        ----------
        options : dict
            Options dictionary.
        data_columns: tuple | list, optional
            Data columns to keep in output data. By default `()`.
        lazy_mode : Literal["self", "parent"], optional
            Lazy loading mode. If `'parent'`, get the nearest ancestor zoom level.
            Defaults to `'self'`.


        Returns
        -------
        pl.DataFrame
            DataFrame with generated data.

        Raises
        ------
        ValueError
            If `options["leaves"]` value is not allowed.
        ValueError
            If `data_columns` columns are not in `data`.

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
        if "lazy" not in options.keys() or not options["lazy"]:
            data = data.select(pl.all().exclude("pylifemap_zoom"))
        elif lazy_mode == "parent":
            data = propagate_parent_zoom(data)

        data = project_to_3857(data, x_col="pylifemap_x", y_col="pylifemap_y")

        return data

from typing import Literal

import polars as pl

from pylifemap.data.backend_data import BACKEND_DATA
from pylifemap.data.geo import project_to_3857
from pylifemap.data.lazy_loading import propagate_parent_zoom
from pylifemap.data.mixins.interfaces import DataMixin
from pylifemap.utils import TAXID_COL


class ArcsDataMixin:
    def arcs_data(
        self: DataMixin,
        options: dict,
        data_columns: tuple | list = (),
        lazy_mode: Literal["self", "parent"] = "self",
    ) -> pl.DataFrame:
        """
        Generate data for an arcs layer.

        Parameters
        ----------
        options : dict
            Options dictionary.
        data_columns : tuple | list, optional
            List of data columns to add to output. By default `()`.
        lazy_mode : Literal["self", "parent"], optional
            Lazy loading mode. If `'parent'`, get the nearest ancestor zoom level.
            Defaults to `'self'`.


        Returns
        -------
        pl.DataFrame
            DataFrame with generated data.
        """

        data = self._data

        dest_col = options["taxid_dest_col"]
        if dest_col not in data.columns:
            msg = f"{dest_col} must be a column of data."
            raise ValueError(msg)

        # Get source points coordinates
        data = data.join(
            BACKEND_DATA.select(
                pl.col("taxid"),
                pl.col("pylifemap_x"),
                pl.col("pylifemap_y"),
                pl.col("pylifemap_zoom"),
            ),
            how="inner",
            left_on=TAXID_COL,
            right_on="taxid",
        ).sort("pylifemap_zoom", descending=True)

        # Get destination point coordinates
        data = (
            data.join(
                BACKEND_DATA.select(
                    pl.col("taxid"),
                    pl.col("pylifemap_x").alias("pylifemap_dest_x"),
                    pl.col("pylifemap_y").alias("pylifemap_dest_y"),
                ),
                left_on=dest_col,
                right_on="taxid",
                how="left",
            )
            .filter((pl.col("pylifemap_dest_x").is_not_null()) & (pl.col("pylifemap_dest_y").is_not_null()))
            .rename({dest_col: "pylifemap_dest_taxid"})
        )

        needed_cols = [
            TAXID_COL,
            "pylifemap_x",
            "pylifemap_y",
            "pylifemap_dest_taxid",
            "pylifemap_dest_x",
            "pylifemap_dest_y",
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

        if "lazy" not in options.keys() or not options["lazy"]:
            data = data.select(pl.all().exclude("pylifemap_zoom"))
        elif lazy_mode == "parent":
            data = propagate_parent_zoom(data)

        data = project_to_3857(data, x_col="pylifemap_x", y_col="pylifemap_y")
        data = project_to_3857(data, x_col="pylifemap_dest_x", y_col="pylifemap_dest_y")

        return data

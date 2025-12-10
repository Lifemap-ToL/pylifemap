import polars as pl

from pylifemap.data.backend_data import BACKEND_DATA

ROOT_ZOOM_LEVEL = 4


def propagate_parent_zoom(d: pl.DataFrame) -> pl.DataFrame:
    """
    Function that takes as input a polars Data Frame with taxids in the "pylifemap_taxid" column,
    and returns the same data frame with a "pylifemap_zoom" column containig the zoom level of its
    nearest ancestor.

    If a "pylifemap_zoom" column already exists, it is replaced by the new one.

    Parameters
    ----------
    d : pl.DataFrame
        The input data frame. Must have an int8 "pylifemap_taxid" column.

    Returns
    -------
    pl.DataFrame
        Result data frame with created or updated "pylifemap_zoom" column.
    """
    taxids = d.select(pl.col("pylifemap_taxid"))
    backend_data = BACKEND_DATA.select(
        pl.col("taxid").alias("pylifemap_taxid"), pl.col("pylifemap_zoom"), pl.col("pylifemap_ascend")
    ).join(taxids, how="semi", on="pylifemap_taxid")
    parent_zooms = (
        backend_data.select(["pylifemap_taxid", "pylifemap_ascend"])
        .explode("pylifemap_ascend")
        .join(
            backend_data.select(["pylifemap_taxid", "pylifemap_zoom"]),
            left_on="pylifemap_ascend",
            right_on="pylifemap_taxid",
            how="left",
        )
        .group_by("pylifemap_taxid")
        .agg(pl.col("pylifemap_zoom").max())
        .with_columns(pl.col("pylifemap_zoom").fill_null(ROOT_ZOOM_LEVEL))
    )
    result = d.select(pl.all().exclude("pylifemap_zoom")).join(parent_zooms, how="left", on="pylifemap_taxid")

    return result

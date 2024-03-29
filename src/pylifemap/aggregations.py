"""
Data aggregation functions.
"""

import pandas as pd
import polars as pl

from pylifemap.utils import LMDATA


def ensure_polars(data) -> pl.DataFrame:
    if isinstance(data, pd.DataFrame):
        return pl.DataFrame(data)
    if isinstance(data, pl.DataFrame):
        return data
    msg = "data must be in a pandas or polars DataFrame."
    raise TypeError(msg)


def aggregate_num(
    d: pd.DataFrame | pl.DataFrame,
    column: str,
    *,
    fn: str = "sum",
    taxid_col: str = "taxid",
) -> pl.DataFrame:
    d = ensure_polars(d)
    if column == "taxid":
        msg = (
            "Can't aggregate on the taxid column, please make a copy and"
            " rename it before."
        )
        raise ValueError(msg)
    fn_dict = {"sum": pl.sum, "mean": pl.mean}
    if fn not in fn_dict:
        msg = f"fn value must be one of {fn_dict.keys()}."
        raise ValueError(msg)
    else:
        agg_fn = fn_dict[fn]
    d = d.select(pl.col(taxid_col).alias("taxid"), pl.col(column))
    res = (
        d.join(LMDATA.select("taxid", "pylifemap_ascend"), on="taxid", how="left")
        .explode("pylifemap_ascend")
        .group_by(["pylifemap_ascend"])
        .agg(agg_fn(column))
        .rename({"pylifemap_ascend": "taxid"})
    )
    leaves = LMDATA.filter(pl.col("pylifemap_leaf"))
    res = pl.concat(
        [res, d.join(leaves, on="taxid", how="semi")], how="vertical_relaxed"
    )
    return res


def aggregate_count(
    d: pd.DataFrame | pl.DataFrame, *, taxid_col: str = "taxid", result_col: str = "n"
) -> pl.DataFrame:
    d = ensure_polars(d)
    d = d.select(pl.col(taxid_col).alias("taxid"))
    res = (
        d.join(LMDATA.select("taxid", "pylifemap_ascend"), on="taxid", how="left")
        .explode("pylifemap_ascend")
        .group_by("pylifemap_ascend")
        .count()
        .rename({"pylifemap_ascend": "taxid", "count": result_col})
    )
    res = pl.concat(
        [res, d.with_columns(pl.col("taxid"), pl.lit(1).alias(result_col))],
        how="vertical_relaxed",
    )
    return res


def aggregate_cat(
    d: pd.DataFrame | pl.DataFrame,
    column: str,
    *,
    keep_leaves: bool = False,
    taxid_col: str = "taxid",
) -> pl.DataFrame:

    d = ensure_polars(d)
    d = d.select(pl.col(taxid_col).alias("taxid"), pl.col(column))
    levels = d.get_column(column).unique()
    res = (
        d.join(LMDATA.select("taxid", "pylifemap_ascend"), on="taxid", how="left")
        .explode("pylifemap_ascend")
        .group_by(["pylifemap_ascend", column])
        .count()
        .rename({"pylifemap_ascend": "taxid"})
    )
    res = res.pivot(index="taxid", columns=column, values="count").fill_null(0)
    res = preprocess_counts(res, columns=levels.to_list(), result_col=column)
    if keep_leaves:
        leaves = d.select([taxid_col, column]).with_columns(
            pl.lit("leaf").alias("pylifemap_count_type")
        )
        res = pl.concat([res, leaves], how="vertical_relaxed")
    return res


def preprocess_counts(
    d: pd.DataFrame | pl.DataFrame,
    columns: list,
    result_col: str,
) -> pl.DataFrame:
    d = ensure_polars(d)
    d = d.with_columns(
        pl.struct(pl.col(columns)).struct.json_encode().alias(result_col),
        pl.lit("count").alias("pylifemap_count_type"),
    ).select(pl.all().exclude(columns))
    return d

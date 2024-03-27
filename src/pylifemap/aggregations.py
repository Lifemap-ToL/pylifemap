"""
Data aggregation functions.
"""

import pandas as pd
import polars as pl

from pylifemap.utils import LMDATA


def convert_to_polars(data) -> pl.DataFrame:
    if isinstance(data, pd.DataFrame):
        return pl.DataFrame(data)
    if isinstance(data, pl.DataFrame):
        return data
    msg = "data must be in a pandas or polars DataFrame."
    raise TypeError(msg)


def aggregate_num(d, column, *, fn="sum", taxid_col="taxid"):
    d = convert_to_polars(d)
    if column == "taxid":
        msg = "Can't aggregate on the taxid column, please make a copy and rename it before."
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


def aggregate_count(d, *, taxid_col="taxid", result_col="n"):
    d = convert_to_polars(d)
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


def aggregate_cat(d, column, *, taxid_col="taxid", keep_individuals=False):
    d = convert_to_polars(d)
    d = d.select(pl.col(taxid_col).alias("taxid"), pl.col(column))
    res = (
        d.join(LMDATA.select("taxid", "pylifemap_ascend"), on="taxid", how="left")
        .explode("pylifemap_ascend")
        .group_by(["pylifemap_ascend", column])
        .count()
        .rename({"pylifemap_ascend": "taxid"})
    )
    if keep_individuals:
        res = pl.concat(
            [res, d.with_columns(pl.lit(1).alias("count"))], how="vertical_relaxed"
        )
    res = res.pivot(index="taxid", columns=column, values="count").fill_null(0)
    return res

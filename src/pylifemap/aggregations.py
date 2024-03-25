"""
Data aggregation functions.
"""

import polars as pl

from pylifemap.utils import LMDATA


def aggregate_num(d, var_col, *, fn=pl.sum, taxid_col="taxid"):
    fn_dict = {"sum": pl.sum, "mean": pl.mean}
    if fn not in fn_dict:
        msg = f"fn value must be one of {fn_dict.keys()}."
        raise ValueError(msg)
    else:
        agg_fn = fn_dict[fn]
    d = d.select(pl.col(taxid_col).alias("taxid"), pl.col(var_col))
    res = (
        d.join(LMDATA.select("taxid", "ascend"), on="taxid", how="left")
        .explode("ascend")
        .group_by(["ascend"])
        .agg(agg_fn(var_col))
        .rename({"ascend": "taxid"})
    )
    res = pl.concat([res, d], how="vertical_relaxed")
    return res


def aggregate_count(d, *, taxid_col="taxid", result_col="n"):
    d = d.select(pl.col(taxid_col).alias("taxid"))
    res = (
        d.join(LMDATA.select("taxid", "ascend"), on="taxid", how="left")
        .explode("ascend")
        .group_by("ascend")
        .count()
        .rename({"ascend": "taxid", "count": result_col})
    )
    res = pl.concat(
        [res, d.with_columns(pl.col("taxid"), pl.lit(1).alias(result_col))],
        how="vertical_relaxed",
    )
    return res


def aggregate_cat(d, var_col, *, taxid_col="taxid", keep_individuals=False):
    d = d.select(pl.col(taxid_col).alias("taxid"), pl.col(var_col))
    res = (
        d.join(LMDATA.select("taxid", "ascend"), on="taxid", how="left")
        .explode("ascend")
        .group_by(["ascend", var_col])
        .count()
        .rename({"ascend": "taxid"})
    )
    if keep_individuals:
        res = pl.concat(
            [res, d.with_columns(pl.lit(1).alias("count"))], how="vertical_relaxed"
        )
    res = res.pivot(index="taxid", columns=var_col, values="count").fill_null(0)
    return res

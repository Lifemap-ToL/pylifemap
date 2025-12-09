"""
Data aggregation functions.
"""

from typing import Literal

import pandas as pd
import polars as pl

from pylifemap.data.backend_data import BACKEND_DATA


def ensure_polars(d: pd.DataFrame | pl.DataFrame) -> pl.DataFrame:
    """
    Ensure that the argument is a pandas or polars DataFrame. If it is a pandas
    DataFrame, converts it to polars.

    Parameters
    ----------
    d : pd.DataFrame | pl.DataFrame
        Object to check and convert.

    Returns
    -------
    pl.DataFrame
        Returned polars DataFrame.

    Raises
    ------
    TypeError
        If `d` is neither a polars or pandas DataFrame.
    """
    if isinstance(d, pd.DataFrame):
        return pl.DataFrame(d)
    if isinstance(d, pl.DataFrame):
        return d
    msg = "data must be a pandas or polars DataFrame."
    raise TypeError(msg)


def ensure_int32(d: pl.DataFrame, taxid_col: str) -> pl.DataFrame:
    """
    Ensure that the `taxid` col of the `data` DataFrame is of type pl.Int32.

    Parameters
    ----------
    d : pl.DataFrame
        DataFrame to check.
    taxid_col : str
        DataFrame column name to check.

    Returns
    -------
    pl.DataFrame
        DataFrame with `taxid_col` converted to `pl.Int32` if necessary.
    """
    return d.with_columns(pl.col(taxid_col).cast(pl.Int32))


def ensure_column_exists(d: pl.DataFrame, column: str) -> None:
    """
    Ensure that a column name is present in a DataFrame.

    Parameters
    ----------
    d : pl.DataFrame
        Polars DataFrame to check for.
    column : str
        Column name to check for.

    Raises
    ------
    ValueError
        If the column is not part of the DataFrame.
    """
    if column not in d.columns:
        msg = f"{column} is not a column of the DataFrame."
        raise ValueError(msg)


def pandas_result(fn):
    """
    Decorator around aggregation functions. If the input is a pandas DataFrame,
    convert the result back to a pandas DataFrame.
    """

    def wrapper(d: pd.DataFrame | pl.DataFrame, *args, **kwargs):
        pandas_input = isinstance(d, pd.DataFrame)

        result = fn(d, *args, **kwargs)

        if pandas_input:
            result = result.to_pandas()

        return result

    return wrapper


@pandas_result
def aggregate_num(
    d: pd.DataFrame | pl.DataFrame,
    column: str,
    *,
    fn: Literal["sum", "mean", "min", "max", "median"] = "sum",
    taxid_col: str = "taxid",
) -> pl.DataFrame | pd.DataFrame:
    """
    Numerical variable aggregation along branches.

    Aggregates a numerical variable in a DataFrame with taxonomy ids along the branches
    of the lifemap tree.

    Parameters
    ----------
    d : pd.DataFrame | pl.DataFrame
        DataFrame to aggregate data from.
    column : str
        Name of the `d` column to aggregate.
    fn : {"sum", "mean", "min", "max", "median"}
        Function used to aggregate the values, by default "sum".
    taxid_col : str, optional
        Name of the `d` column containing taxonomy ids, by default "taxid"

    Returns
    -------
    pl.DataFrame | pd.DataFrame
        Aggregated DataFrame in the same format as input.

    Raises
    ------
    ValueError
        If `column` is equal to "taxid".
    ValueError
        If `fn` is not on the allowed values.

    See also
    --------
    [](`~pylifemap.aggregate_count`) : aggregation of the number of observations.

    [](`~pylifemap.aggregate_freq`) : aggregation of the values counts of a
        categorical variable.

    Examples
    --------
    >>> from pylifemap import aggregate_num
    >>> import polars as pl
    >>> d = pl.DataFrame({"taxid": [33154, 33090, 2], "value": [10, 5, 100]})
    >>> aggregate_num(d, column="value", fn="sum")
    shape: (5, 2)
    ┌───────┬───────┐
    │ taxid ┆ value │
    │ ---   ┆ ---   │
    │ i32   ┆ i64   │
    ╞═══════╪═══════╡
    │ 0     ┆ 115   │
    │ 2     ┆ 100   │
    │ 2759  ┆ 15    │
    │ 33090 ┆ 5     │
    │ 33154 ┆ 10    │
    └───────┴───────┘
    """
    d = ensure_polars(d)
    ensure_column_exists(d, column)
    ensure_column_exists(d, taxid_col)
    d = ensure_int32(d, taxid_col)

    # Column can't be taxid to avoid conflicts later
    if column == "taxid":
        msg = "Can't aggregate on the taxid column, please make a copy and rename it before."
        raise ValueError(msg)
    # Check aggregation function
    fn_dict = {
        "sum": pl.sum,
        "mean": pl.mean,
        "min": pl.min,
        "max": pl.max,
        "median": pl.median,
    }
    if fn not in fn_dict:
        msg = f"fn value must be one of {fn_dict.keys()}."
        raise ValueError(msg)
    else:
        agg_fn = fn_dict[fn]
    # Generate dataframe of parent values
    d = d.select(pl.col(taxid_col), pl.col(column))
    res = d.join(
        BACKEND_DATA.select("taxid", "pylifemap_ascend"), left_on=taxid_col, right_on="taxid", how="left"
    ).explode("pylifemap_ascend")
    # Get original nodes data with itself as parent in order to take into account
    # the nodes values
    obs = d.with_columns(pl.col(taxid_col).alias("pylifemap_ascend"))
    # Concat parent and node values
    res = pl.concat([res, obs])
    # Group by parent and aggregate values
    res = res.group_by(["pylifemap_ascend"]).agg(agg_fn(column)).rename({"pylifemap_ascend": taxid_col})
    res = res.sort(taxid_col)

    return res


@pandas_result
def aggregate_count(
    d: pd.DataFrame | pl.DataFrame, *, result_col: str = "n", taxid_col: str = "taxid"
) -> pl.DataFrame | pd.DataFrame:
    """
    Nodes count aggregation along branches.

    Aggregates nodes count in a DataFrame with taxonomy ids along the branches
    of the lifemap tree.

    Parameters
    ----------
    d : pd.DataFrame | pl.DataFrame
        DataFrame to aggregate data from.
    result_col : str, optional
        Name of the column created to store the counts, by default "n".
    taxid_col : str, optional
        Name of the `d` column containing taxonomy ids, by default "taxid".

    Returns
    -------
    pl.DataFrame | pd.DataFrame
        Aggregated DataFrame in the same format as input.

    See also
    --------
    [](`~pylifemap.aggregate_num`) : aggregation of a numeric variable.

    [](`~pylifemap.aggregate_freq`) : aggregation of the values counts of a categorical
        variable.

    Examples
    --------
    >>> from pylifemap import aggregate_count
    >>> import polars as pl
    >>> d = pl.DataFrame({"taxid": [33154, 33090, 2]})
    >>> aggregate_count(d)
    shape: (5, 2)
    ┌───────┬─────┐
    │ taxid ┆ n   │
    │ ---   ┆ --- │
    │ i32   ┆ u32 │
    ╞═══════╪═════╡
    │ 0     ┆ 3   │
    │ 2     ┆ 1   │
    │ 2759  ┆ 2   │
    │ 33090 ┆ 1   │
    │ 33154 ┆ 1   │
    └───────┴─────┘
    """
    d = ensure_polars(d)
    ensure_column_exists(d, taxid_col)
    d = ensure_int32(d, taxid_col)
    # Generate dataframe of parent counts
    d = d.select(pl.col(taxid_col))
    res = d.join(
        BACKEND_DATA.select("taxid", "pylifemap_ascend"), left_on=taxid_col, right_on="taxid", how="left"
    ).explode("pylifemap_ascend")
    # Get original nodes with itself as parent in order to take into account
    # the nodes themselves
    obs = d.with_columns(pl.col(taxid_col).alias("pylifemap_ascend"))
    # Concat parent and node values
    res = pl.concat([res, obs])
    # Group by parent and count
    res = res.group_by("pylifemap_ascend").len(name=result_col).rename({"pylifemap_ascend": taxid_col})
    res = res.sort(taxid_col)

    return res


@pandas_result
def aggregate_freq(
    d: pd.DataFrame | pl.DataFrame,
    column: str,
    *,
    taxid_col: str = "taxid",
) -> pl.DataFrame | pd.DataFrame:
    """
    Categorical variable frequencies aggregation along branches.

    Aggregates a categorical variable in a DataFrame with taxonomy ids as levels
    frequencies along the branches of the lifemap tree.

    Parameters
    ----------
    d : pd.DataFrame | pl.DataFrame
        DataFrame to aggregate data from.
    column : str
        Name of the `d` column to aggregate.
    taxid_col : str, optional
        Name of the `d` column containing taxonomy ids, by default "taxid".

    Returns
    -------
    pl.DataFrame | pd.DataFrame
        Aggregated DataFrame in the same format as input. The "count" column contains the value
        counts as a polars struct.

    See also
    --------
    [](`~pylifemap.aggregate_num`) : aggregation of a numeric variable.

    [](`~pylifemap.aggregate_count`) : aggregation of the number of observations.

    Examples
    --------
    >>> from pylifemap import aggregate_freq
    >>> import polars as pl
    >>> d = pl.DataFrame({"taxid": [33154, 33090, 2], "value": ["a", "b", "a"]})
    >>> aggregate_freq(d, column="value")
    shape: (7, 3)
    ┌───────┬───────┬───────┐
    │ taxid ┆ value ┆ count │
    │ ---   ┆ ---   ┆ ---   │
    │ i32   ┆ str   ┆ u32   │
    ╞═══════╪═══════╪═══════╡
    │ 0     ┆ a     ┆ 2     │
    │ 0     ┆ b     ┆ 1     │
    │ 2     ┆ a     ┆ 1     │
    │ 2759  ┆ a     ┆ 1     │
    │ 2759  ┆ b     ┆ 1     │
    │ 33090 ┆ b     ┆ 1     │
    │ 33154 ┆ a     ┆ 1     │
    └───────┴───────┴───────┘
    """
    d = ensure_polars(d)
    ensure_column_exists(d, taxid_col)
    ensure_column_exists(d, column)
    d = ensure_int32(d, taxid_col)
    # Generate dataframe of parent counts
    d = d.select(pl.col(taxid_col), pl.col(column))
    res = d.join(
        BACKEND_DATA.select("taxid", "pylifemap_ascend"), left_on=taxid_col, right_on="taxid", how="left"
    ).explode("pylifemap_ascend")
    # Get original nodes with itself as parent in order to take into account
    # the nodes themselves
    obs = d.with_columns(pl.col(taxid_col).alias("pylifemap_ascend"))
    # Concat parent and node values
    res = pl.concat([res, obs])
    # Group by parent and value, and count
    res = res.group_by(["pylifemap_ascend", column]).len(name="count").rename({"pylifemap_ascend": taxid_col})
    res = res.sort([taxid_col, column])

    return res

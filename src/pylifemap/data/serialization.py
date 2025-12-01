"""
Functions for DataFrame objects conversion to Arrow IPC bytes.
"""

import io
from typing import Any

import pandas as pd
import polars as pl
import pyarrow.feather as pf


def serialize_data(data: Any) -> dict:
    """
    Serialize an object.

    Pandas and polars DataFrames are serialized to Apache Arrow IPC, other objects are
    kept as is.

    Parameters
    ----------
    data : Any
        Object to serialize.

    Returns
    -------
    dict
        Dictionary with a "serialized" entry indicating if the data has been serialzed,
        and a "data" entry with the corresponding data.
    """

    # If polars DataFrame, serialize to Arrow IPC
    if isinstance(data, pl.DataFrame):
        return {"serialized": True, "value": pl_to_arrow(data)}
    # If pandas DataFrame, serialize to Arrow IPC
    elif isinstance(data, pd.DataFrame):
        return {"serialized": True, "value": pd_to_arrow(data)}
    # Else, keep as is
    else:
        return {"serialized": False, "value": data}


def pd_to_arrow(df: pd.DataFrame) -> bytes:
    """
    Convert a pandas DataFrame to Arrow IPC bytes.

    Arguments
    ---------
    df : pd.DataFrame
        Pandas DataFrame to convert.

    Returns
    -------
    bytes
        Arrow IPC bytes
    """
    f = io.BytesIO()
    df.to_feather(f, compression="lz4")
    return f.getvalue()


def pl_to_arrow(df: pl.DataFrame) -> bytes:
    """
    Convert a polars DataFrame to Arrow IPC bytes.

    Arguments
    ---------
    df : pl.DataFrame
        Polars DataFrame to convert.

    Returns
    -------
    bytes
        Arrow IPC bytes
    """
    f = io.BytesIO()
    pf.write_feather(df.to_arrow(), f, compression="lz4")
    return f.getvalue()

"""
Functions for DataFrame objects conversion to Arrow IPC bytes.
"""

import io
from typing import Any

import pandas as pd
import polars as pl
import pyarrow as pa
import pyarrow.feather as pf


def serialize_data(data: Any) -> Any:
    """Serialize a data object.

    Args:
        data (Any): data object to serialize.
        renderer (str): renderer.

    Returns:
        Any: serialized data object.
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
    """Convert a pandas DataFrame to Arrow IPC bytes.

    Args:
        df (pd.DataFrame): pandas DataFrame to convert.

    Returns:
        bytes: Arrow IPC bytes
    """
    f = io.BytesIO()
    df.to_feather(f, compression="uncompressed")
    return f.getvalue()


def pl_to_arrow(df: pl.DataFrame) -> bytes:
    """Convert a polars DataFrame to Arrow IPC bytes.

    Args:
        df (pl.DataFrame): polars DataFrame to convert.

    Returns:
        bytes: Arrow IPC bytes.
    """

    f = io.BytesIO()
    pf.write_feather(df.to_arrow(), f, compression="uncompressed")
    return f.getvalue()

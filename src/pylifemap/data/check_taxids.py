import pandas as pd
import polars as pl

from pylifemap.data.lifemap_data import LifemapData


def get_unknown_taxids(data: pl.DataFrame | pd.DataFrame, taxid_col: str = "taxid") -> list:
    """
    Get a list of taxids from a data frame which are not in Lifemap data.

    Parameters
    ----------
    data : pl.DataFrame | pd.DataFrame
        Pandas or polars dataframe with original data.
    taxid_col : str
        Name of the column storing taxonomy ids, by default "taxid".

    Returns
    -------
    list
        Missing taxids

    See also
    --------
    [](`~pylifemap.get_duplicated_taxids`) : function to get a list of duplicated taxids.

    Examples
    --------
    >>> from pylifemap import get_unknown_taxids
    >>> import polars as pl
    >>> d = pl.DataFrame({"taxid_values": [33154, 33090, 2, -14, 1], "value": [10, 5, 100, 1, 2]})
    >>> get_unknown_taxids(d, taxid_col="taxid_values")
    [-14, 1]
    """
    return LifemapData(data, taxid_col=taxid_col, check_taxids=False).get_unknown_taxids()


def get_duplicated_taxids(data: pl.DataFrame | pd.DataFrame, taxid_col: str = "taxid") -> list:
    """
    Get a list of duplicated taxids in a data frame.

    Parameters
    ----------
    data : pl.DataFrame | pd.DataFrame
        Pandas or polars dataframe with original data.
    taxid_col : str
        Name of the column storing taxonomy ids, by default "taxid".

    Returns
    -------
    list
        Duplicated taxids

    See also
    --------
    [](`~pylifemap.get_unknown_taxids`) : function to get a list of unknown taxids.

    Examples
    --------
    >>> from pylifemap import get_duplicated_taxids
    >>> import polars as pl
    >>> d = pl.DataFrame({"taxid_values": [2, 33154, 33090, 33090, 2], "value": [10, 5, 100, 1, 2]})
    >>> get_duplicated_taxids(d, taxid_col="taxid_values")
    [2, 33090]
    """
    return LifemapData(data, taxid_col=taxid_col, check_taxids=False).get_duplicated_taxids()

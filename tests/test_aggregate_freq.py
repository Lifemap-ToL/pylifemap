"""
Tests for categorical data value counts aggregation.
"""

import pandas as pd
import polars as pl
import pytest

from pylifemap import aggregate_freq

df1 = pd.DataFrame(
    {
        "taxid": [33213, 33154, 33208, 33090, 33208, 2],
        "value": ["a", "a", "b", "b", "a", "c"],
    }
)


df1_agg = pl.DataFrame(
    {
        "taxid": [
            0,
            0,
            0,
            2,
            2759,
            2759,
            6072,
            33090,
            33154,
            33154,
            33208,
            33208,
            33213,
        ],
        "value": ["a", "b", "c", "c", "a", "b", "a", "b", "a", "b", "a", "b", "a"],
        "count": [3, 2, 1, 1, 3, 2, 1, 1, 3, 1, 2, 1, 1],
    }
)


@pytest.fixture
def df1_pl():
    return pl.DataFrame(df1)


@pytest.fixture
def df1_pd():
    return df1


class TestAggregateFreqErrors:
    def test_error_not_df(self):
        with pytest.raises(TypeError):
            aggregate_freq("whatever", column="whatever")  # type: ignore

    def test_wrong_taxid_col(self, df1_pl):
        with pytest.raises(ValueError):
            aggregate_freq(df1_pl, column="value", taxid_col="whatever")

    def test_wrong_column(self, df1_pl):
        with pytest.raises(ValueError):
            aggregate_freq(df1_pl, column="whatever")


class TestAggregateFreqResults:
    def test_freq_df1_pl(self, df1_pl):
        tmp = aggregate_freq(df1_pl, column="value")
        assert pl.DataFrame(df1_agg).equals(tmp)  # type:ignore

    def test_freq_df1_pd(self, df1_pd):
        tmp = aggregate_freq(df1_pd, column="value")
        res = df1_agg.to_pandas()
        pd.testing.assert_frame_equal(tmp, res, check_dtype=False)

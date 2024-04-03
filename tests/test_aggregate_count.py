"""
Tests for count data aggregation.
"""

import pandas as pd
import polars as pl
import pytest

from pylifemap import aggregate_count

df1 = pd.DataFrame({"taxid": [33213, 33154, 33208, 33090, 33208, 2]})

df1_agg = pl.DataFrame(
    {
        "taxid": [0, 2, 2759, 6072, 33090, 33154, 33208, 33213],
        "n": [6, 1, 5, 1, 1, 4, 3, 1],
    }
)


@pytest.fixture
def df1_pl():
    return pl.DataFrame(df1)


@pytest.fixture
def df1_pd():
    return df1


class TestAggregateCountErrors:
    def test_error_not_df(self):
        with pytest.raises(TypeError):
            aggregate_count("whatever")  # type: ignore

    def test_wrong_taxid_col(self):
        with pytest.raises(ValueError):
            aggregate_count(df1, taxid_col="whatever")


class TestAggregateCountResults:
    def test_count_df1_pl(self, df1_pl):
        tmp = aggregate_count(df1_pl)
        assert pl.DataFrame(df1_agg).equals(tmp)

    def test_count_df1_pd(self, df1_pd):
        tmp = aggregate_count(df1_pd)
        assert df1_agg.equals(tmp)

    def test_count_df1_result_col(self, df1_pl):
        tmp = aggregate_count(df1_pl, result_col="out")
        assert pl.DataFrame(df1_agg).rename({"n": "out"}).equals(tmp)

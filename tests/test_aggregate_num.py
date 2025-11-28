"""
Tests for numerical data aggregation.
"""

import pandas as pd
import polars as pl
import pytest

from pylifemap import aggregate_num

df1 = pd.DataFrame({"taxid": [33213, 33154, 33208, 33090, 33208, 2], "value": [1, 2, 3, 4, 5, 6]})


df1_agg_sum = pl.DataFrame(
    {
        "taxid": [0, 2, 2759, 6072, 33090, 33154, 33208, 33213],
        "value": [21, 6, 15, 1, 4, 11, 9, 1],
    }
)

df1_agg_mean = pl.DataFrame(
    {
        "taxid": [0, 2, 2759, 6072, 33090, 33154, 33208, 33213],
        "value": [3.5, 6.0, 3.0, 1.0, 4.0, 2.75, 3.0, 1.0],
    }
)

df1_agg_min = pl.DataFrame(
    {
        "taxid": [0, 2, 2759, 6072, 33090, 33154, 33208, 33213],
        "value": [1.0, 6.0, 1.0, 1.0, 4.0, 1.0, 1.0, 1.0],
    }
)

df1_agg_max = pl.DataFrame(
    {
        "taxid": [0, 2, 2759, 6072, 33090, 33154, 33208, 33213],
        "value": [6.0, 6.0, 5.0, 1.0, 4.0, 5.0, 5.0, 1.0],
    }
)

df1_agg_median = pl.DataFrame(
    {
        "taxid": [0, 2, 2759, 6072, 33090, 33154, 33208, 33213],
        "value": [3.5, 6.0, 3.0, 1.0, 4.0, 2.5, 3.0, 1.0],
    }
)


@pytest.fixture
def df1_pl():
    return pl.DataFrame(df1)


@pytest.fixture
def df1_pd():
    return df1


class TestAggregateNumErrors:
    def test_error_not_df(self):
        with pytest.raises(TypeError):
            aggregate_num("whatever", "whatever")  # type: ignore

    def test_wrong_taxid_col(self, df1_pl):
        with pytest.raises(ValueError):
            aggregate_num(df1_pl, taxid_col="whatever", column="value")

    def test_wrong_column(self, df1_pl):
        with pytest.raises(ValueError):
            aggregate_num(df1_pl, column="whatever")

    def test_wrong_fn(self, df1_pl):
        with pytest.raises(ValueError):
            aggregate_num(df1_pl, column="whatever", fn="whatever")  # type: ignore

    def test_error_col_taxid(self, df1_pl):
        with pytest.raises(ValueError):
            aggregate_num(df1_pl, "taxid")


class TestAggregateNumResults:
    def test_num_df1_pl_sum(self, df1_pl):
        tmp = aggregate_num(df1_pl, column="value", fn="sum")
        assert pl.DataFrame(df1_agg_sum).equals(tmp)  # type: ignore

    def test_num_df1_pd_sum(self, df1_pd):
        tmp = aggregate_num(df1_pd, column="value", fn="sum")
        pd.testing.assert_frame_equal(tmp, df1_agg_sum.to_pandas(), check_dtype=False)

    def test_num_df1_pl_mean(self, df1_pl):
        tmp = aggregate_num(df1_pl, column="value", fn="mean")
        assert pl.DataFrame(df1_agg_mean).equals(tmp)  # type: ignore

    def test_num_df1_pd_mean(self, df1_pd):
        tmp = aggregate_num(df1_pd, column="value", fn="mean")
        pd.testing.assert_frame_equal(tmp, df1_agg_mean.to_pandas(), check_dtype=False)

    def test_num_df1_pl_min(self, df1_pl):
        tmp = aggregate_num(df1_pl, column="value", fn="min")
        assert pl.DataFrame(df1_agg_min).equals(tmp)  # type: ignore

    def test_num_df1_pd_min(self, df1_pd):
        tmp = aggregate_num(df1_pd, column="value", fn="min")
        pd.testing.assert_frame_equal(tmp, df1_agg_min.to_pandas(), check_dtype=False)

    def test_num_df1_pl_max(self, df1_pl):
        tmp = aggregate_num(df1_pl, column="value", fn="max")
        assert pl.DataFrame(df1_agg_max).equals(tmp)  # type: ignore

    def test_num_df1_pd_max(self, df1_pd):
        tmp = aggregate_num(df1_pd, column="value", fn="max")
        pd.testing.assert_frame_equal(tmp, df1_agg_max.to_pandas(), check_dtype=False)

    def test_num_df1_pl_median(self, df1_pl):
        tmp = aggregate_num(df1_pl, column="value", fn="median")
        assert pl.DataFrame(df1_agg_median).equals(tmp)  # type: ignore

    def test_num_df1_pd_median(self, df1_pd):
        tmp = aggregate_num(df1_pd, column="value", fn="median")
        pd.testing.assert_frame_equal(tmp, df1_agg_median.to_pandas(), check_dtype=False)

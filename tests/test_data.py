"""
Tests for LifemapData class.
"""

import pandas as pd
import polars as pl
import pytest

from pylifemap.aggregations import aggregate_freq, aggregate_num
from pylifemap.data import LifemapData

# from pylifemap.utils import LMDATA

d = pd.DataFrame({"tid": [33090, 33208, 2, 2944257], "value": [1, 2, 3, 4]})
d_pl_int64 = pl.DataFrame(d, schema_overrides={"tid": pl.Int64})
d_cat = pl.DataFrame(d).with_columns(pl.col("value").cast(pl.Utf8))


@pytest.fixture
def data_pl():
    return pl.DataFrame(d)


@pytest.fixture
def data_pl_int64():
    return d_pl_int64


@pytest.fixture
def data_pd():
    return d


@pytest.fixture
def data_cat():
    return d_cat


@pytest.fixture
def lmd():
    return LifemapData(data=d, taxid_col="tid")


class TestLifemapDataInit:
    def test_data_is_dataframe(self):
        with pytest.raises(TypeError):
            LifemapData("whatever")  # type: ignore

    def test_taxid_col_in_data(self, data_pl):
        with pytest.raises(ValueError):
            LifemapData(data_pl, taxid_col="whatever")  # type: ignore

    def test_convert_to_polars(self, data_pd, data_pl):
        lmd = LifemapData(data_pd, taxid_col="tid")
        assert lmd.data.equals(data_pl)

    def test_convert_taxid_int32(self, data_pl_int64):
        lmd = LifemapData(data_pl_int64, taxid_col="tid")
        assert lmd.data.get_column("tid").dtype == pl.Int32


class TestLifemapDataMethods:
    def test_with_parents(self, lmd):
        tmp = lmd.data_with_parents().sort("value")
        assert tmp.equals(
            pl.DataFrame(
                {
                    "tid": [33090, 33208, 2, 2944257],
                    "value": [1, 2, 3, 4],
                    "pylifemap_parent": [2759, 33154, 0, 1923837],
                }
            )
        )


class TestPointsData:
    def test_points_data(self, lmd):
        tmp = lmd.points_data(options={"fill_col": "value"})
        assert tmp.shape == (4, 5)
        assert sorted(tmp.columns) == [
            "pylifemap_x",
            "pylifemap_y",
            "pylifemap_zoom",
            "tid",
            "value",
        ]
        assert tmp.get_column("pylifemap_zoom").sort().to_list() == [6, 8, 8, 20]

    def test_points_data_leaves_omit(self, lmd):
        tmp = lmd.points_data(options={"fill_col": "value", "leaves": "omit"})
        assert tmp.shape == (3, 5)
        assert sorted(tmp.columns) == [
            "pylifemap_x",
            "pylifemap_y",
            "pylifemap_zoom",
            "tid",
            "value",
        ]
        assert tmp.get_column("pylifemap_zoom").sort().to_list() == [6, 8, 8]

    def test_points_data_leaves_only(self, lmd):
        tmp = lmd.points_data(
            options={"fill_col": "value", "radius_col": "value", "leaves": "only"}
        )
        assert tmp.shape == (1, 5)
        assert sorted(tmp.columns) == [
            "pylifemap_x",
            "pylifemap_y",
            "pylifemap_zoom",
            "tid",
            "value",
        ]
        assert tmp.get_column("pylifemap_zoom").sort().to_list() == [20]


class TestDonutsData:
    def test_donuts_data(self, data_cat):
        dagg = aggregate_freq(data_cat, column="value", taxid_col="tid")
        lmd = LifemapData(data=dagg)
        tmp = lmd.donuts_data({"counts_col": "value"})
        assert tmp.shape == (10, 5)
        assert sorted(tmp.columns) == [
            "pylifemap_x",
            "pylifemap_y",
            "pylifemap_zoom",
            "taxid",
            "value",
        ]
        assert (
            tmp.filter(pl.col("taxid") == 0).get_column("value").item()
            == '{"1":1,"2":1,"3":1,"4":1}'
        )


class TestLinesData:
    def test_lines_data(self, data_pl):
        dagg = aggregate_num(data_pl, column="value", taxid_col="tid", fn="sum")
        lmd = LifemapData(data=dagg)
        tmp = lmd.lines_data({"width_col": "value"})
        assert tmp.shape == (10, 6)
        assert sorted(tmp.columns) == [
            "pylifemap_x0",
            "pylifemap_x1",
            "pylifemap_y0",
            "pylifemap_y1",
            "taxid",
            "value",
        ]
        assert tmp.get_column("value").sort().to_list() == [
            1,
            2,
            3,
            4,
            4,
            4,
            4,
            4,
            6,
            7,
        ]

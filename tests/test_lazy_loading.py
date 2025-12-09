"""
Tests for lazy loading utility functions.
"""

import polars as pl
import pytest

from pylifemap.data.lazy_loading import propagate_parent_zoom
from pylifemap.data.lifemap_data import LifemapData

pl_df = pl.DataFrame({"pylifemap_taxid": [2157, 1_783_263, 48510, 55_559]}).with_columns(
    pl.col("pylifemap_taxid").cast(pl.Int32)
)


@pytest.fixture
def d():
    return pl_df


class TestPropagateParentZoom:
    def test_propagate_parent_zoom(self, d):
        res = propagate_parent_zoom(d).sort("pylifemap_taxid")
        assert res.shape == (4, 2)
        assert res.get_column("pylifemap_taxid").to_list() == [2157, 48510, 55559, 1783263]
        assert res.get_column("pylifemap_zoom").to_list() == [4, 6, 8, 6]

    def test_points_data_lazy_parent(self, d):
        lm = LifemapData(d, taxid_col="pylifemap_taxid")
        data_self = lm.points_data(lazy_mode="self").sort("pylifemap_taxid")
        data_parent = lm.points_data(lazy_mode="parent").sort("pylifemap_taxid")
        assert data_self.get_column("pylifemap_taxid").to_list() == [2157, 48510, 55559, 1783263]
        assert data_parent.get_column("pylifemap_taxid").to_list() == [2157, 48510, 55559, 1783263]
        assert data_self.get_column("pylifemap_zoom").to_list() == [6, 8, 18, 13]
        assert data_parent.get_column("pylifemap_zoom").to_list() == [4, 6, 8, 6]

    def test_lines_data_lazy_parent(self, d):
        lm = LifemapData(d, taxid_col="pylifemap_taxid")
        data_self = lm.lines_data(lazy_mode="self").sort("pylifemap_taxid")
        data_parent = lm.lines_data(lazy_mode="parent").sort("pylifemap_taxid")
        assert data_self.get_column("pylifemap_taxid").to_list() == [2157, 48510, 55559, 1783263]
        assert data_parent.get_column("pylifemap_taxid").to_list() == [2157, 48510, 55559, 1783263]
        assert data_self.get_column("pylifemap_zoom").to_list() == [6, 8, 18, 13]
        assert data_parent.get_column("pylifemap_zoom").to_list() == [4, 6, 8, 6]

import polars as pl
import logging

LMDATA_RAW = "scripts/data/lmdata_raw.parquet"
LMDATA_OUT = "src/pylifemap/data/lmdata.parquet"

LUCA = {"lat": -4.226497, "lon": 0}

logging.basicConfig(level=logging.INFO)


# def aggregate_depth(d, col, depth):
#     agg_values = (
#         d.filter(pl.col("depth") == depth).group_by(pl.col("parent")).agg(pl.sum(col))
#     )
#     return d.update(agg_values, left_on="taxid", right_on="parent", how="left")


def convert_lmdata(lm: pl.DataFrame) -> pl.DataFrame:
    # Add root
    lm = pl.concat(
        [
            lm,
            pl.DataFrame(
                [
                    {
                        "taxid": 0,
                        "sci_name": "Luca",
                        "zoom": 5,
                        "lat": LUCA["lat"],
                        "lon": LUCA["lon"],
                        "ascend": [],
                    }
                ],
                schema_overrides={
                    "taxid": pl.Int32,
                    "zoom": pl.Int32,
                    "ascend": pl.List(pl.Int32),
                },
            ),
        ],
        how="diagonal_relaxed",
    )
    lm = lm.with_columns(
        pl.col("lat").cast(pl.Float64),
        pl.col("lon").cast(pl.Float64),
        pl.col("zoom").fill_null(1).cast(pl.Int8),
        pl.col("sci_name").cast(pl.Utf8),
        # depth=pl.col("ascend").list.len(),
        parent=pl.col("ascend").list.get(0),
    )
    # Compute n_childs
    parents = lm.get_column("parent").unique()
    lm = lm.with_columns(leaf=pl.col("taxid").is_in(parents).not_())
    # lm = lm.with_columns(
    #    child=pl.when(pl.col("leaf")).then(1).otherwise(None)
    # )
    # max_depth = lm.select(pl.col("depth").max()).item()
    # for depth in range(max_depth, 0, -1):
    #    lm = aggregate_depth(lm, "child", depth)
    # lm = lm.rename({"child": "n_childs"})
    lm = lm.rename(
        {
            "lon": "pylifemap_x",
            "lat": "pylifemap_y",
            "zoom": "pylifemap_zoom",
            "ascend": "pylifemap_ascend",
            "leaf": "pylifemap_leaf",
        }
    )
    lm = lm.select(
        [
            "taxid",
            "pylifemap_zoom",
            "pylifemap_x",
            "pylifemap_y",
            "pylifemap_ascend",
            "pylifemap_leaf",
        ]
    )
    return lm


if __name__ == "__main__":
    logging.info(f"Reading {LMDATA_RAW}...")
    lm = pl.read_parquet(LMDATA_RAW)
    logging.info("Converting data...")
    lm_out = convert_lmdata(lm)
    logging.info(f"Writing {LMDATA_OUT}...")
    lm_out.write_parquet(LMDATA_OUT)
    logging.info("Done.")

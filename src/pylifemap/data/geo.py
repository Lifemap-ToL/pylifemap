import polars as pl
from pyproj import Transformer

# Projection from GPS (longitude, latitude) to Web mercator
TRANSFORMER = Transformer.from_crs(4326, 3857, always_xy=True)


def project_to_3857(data: pl.DataFrame, x_col: str, y_col: str) -> pl.DataFrame:
    """
    Reproject two x,y columns in a DataFrame from EPSG 4326 (GPS) to EPSG 3857 (Web Mercator)

    Parameters
    ----------
    data : pl.DataFrame
        Source DataFrame
    x_col : str
        Name of column with x coordinates
    y_col : str
        Name of column with y coordinates

    Returns
    -------
    pl.DataFrame
        DataFrame with reprojected columns
    """
    x_proj, y_proj = TRANSFORMER.transform(data.get_column(x_col), data.get_column(y_col))
    data = data.with_columns(
        pl.Series(x_proj).alias(x_col),
        pl.Series(y_proj).alias(y_col),
    )
    return data

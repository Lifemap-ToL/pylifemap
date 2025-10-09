import polars as pl
import requests
from platformdirs import user_cache_path

from pylifemap.utils import logger

LIFEMAP_BACK_URL = "https://lifemap-back.univ-lyon1.fr"
LMDATA_DATA_URL = f"{LIFEMAP_BACK_URL}/data/lmdata.parquet"
LMDATA_TIMESTAMP_URL = f"{LIFEMAP_BACK_URL}/data/timestamp.txt"

LMDATA_PATH = user_cache_path("pylifemap") / "data"
LMDATA_DATA_PATH = LMDATA_PATH / "lmdata.parquet"
LMDATA_TIMESTAMP_PATH = LMDATA_PATH / "timestamp.txt"


class LmData:
    """
    A class to manage NCBI data for Lifemap hosted on lifemap-back.

    This class handles the downloading, caching, and accessing of NCBI data
    used in the Lifemap project. It checks for updates, downloads new data
    when available, and provides access to the data as a Polars DataFrame.
    """

    def __init__(self):
        """
        Initialize the LmData object.

        Sets up the data storage and checks for updates upon instantiation.
        """
        self._data: pl.DataFrame | None = None

        LMDATA_PATH.mkdir(exist_ok=True, parents=True)

        download = not self.lmdata_ok()
        if download:
            logger.info("Newer data available, downloading...")
            self.download_timestamp()
            self.download_data()
            logger.info("Done.")

        self._data = pl.read_parquet(LMDATA_DATA_PATH)

    def lmdata_ok(self) -> bool:
        """
        Check if the local data is up-to-date.

        Compares the local timestamp with the remote timestamp to determine
        if new data is available.

        Returns
        -------
        bool
            True if local data is up-to-date, False otherwise.
        """
        cache_timestamp = 0
        if LMDATA_TIMESTAMP_PATH.exists():
            cache_timestamp = int(LMDATA_TIMESTAMP_PATH.read_text())
        remote_timestamp = int(requests.get(LMDATA_TIMESTAMP_URL, timeout=10).text)
        return cache_timestamp == remote_timestamp

    def download_data(self) -> None:
        """
        Download the latest NCBI data from lifemap-back

        Fetches the data from the remote server and saves it locally.
        """

        response = requests.get(LMDATA_DATA_URL, timeout=10)
        LMDATA_DATA_PATH.write_bytes(response.content)

    def download_timestamp(self) -> None:
        """
        Download the latest data timestamp from lifemap-back.

        Fetches the current timestamp from the remote server and saves it locally.
        """

        response = requests.get(LMDATA_TIMESTAMP_URL, timeout=10)
        LMDATA_TIMESTAMP_PATH.write_text(response.text)

    @property
    def data(self) -> pl.DataFrame:
        """
        Access the NCBI data.

        Returns:
            pl.DataFrame: The NCBI data as a Polars DataFrame.

        Raises:
            ValueError: If the data is not available.
        """

        if self._data is None:
            msg = "Lifemap data not available and not downloadable."
            raise ValueError(msg)
        return self._data


# Load lifemap-back NCBI data
LMDATA = LmData().data

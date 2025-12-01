import polars as pl
import requests
from platformdirs import user_cache_path

from pylifemap.utils import LIFEMAP_BACK_URL

BACKEND_DATA_URL = f"{LIFEMAP_BACK_URL}/data/lmdata.parquet"
BACKEND_DATA_TIMESTAMP_URL = f"{LIFEMAP_BACK_URL}/data/timestamp.txt"

BACKEND_DATA_DIR = user_cache_path("pylifemap") / "data"
BACKEND_DATA_PATH = BACKEND_DATA_DIR / "lmdata.parquet"
BACKEND_DATA_TIMESTAMP_PATH = BACKEND_DATA_DIR / "timestamp.txt"


class BackendData:
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

        BACKEND_DATA_DIR.mkdir(exist_ok=True, parents=True)

        download = not self.lmdata_ok()
        if download:
            self.download_timestamp()
            self.download_data()

        self._data = pl.read_parquet(BACKEND_DATA_PATH)

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
        if BACKEND_DATA_TIMESTAMP_PATH.exists():
            cache_timestamp = int(BACKEND_DATA_TIMESTAMP_PATH.read_text())
        remote_timestamp = int(requests.get(BACKEND_DATA_TIMESTAMP_URL, timeout=10).text)
        return cache_timestamp == remote_timestamp

    def download_data(self) -> None:
        """
        Download the latest NCBI data from lifemap-back

        Fetches the data from the remote server and saves it locally.
        """

        response = requests.get(BACKEND_DATA_URL, timeout=10)
        BACKEND_DATA_PATH.write_bytes(response.content)

    def download_timestamp(self) -> None:
        """
        Download the latest data timestamp from lifemap-back.

        Fetches the current timestamp from the remote server and saves it locally.
        """

        response = requests.get(BACKEND_DATA_TIMESTAMP_URL, timeout=10)
        BACKEND_DATA_TIMESTAMP_PATH.write_text(response.text)

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
BACKEND_DATA = BackendData().data

"""
Misc utilities functions and values.
"""

import base64
import logging
import re
import sys
from pathlib import Path

import requests

DEFAULT_WIDTH = "800px"
DEFAULT_HEIGHT = "600px"
LIFEMAP_BACK_URL = "https://lifemap-back.univ-lyon1.fr"

MAX_HOVER_DATA_LEN = 10_000

logger = logging.getLogger("pylifemap")
ch = logging.StreamHandler(stream=sys.stdout)
logger.addHandler(ch)
logger.setLevel(logging.INFO)


def check_marimo() -> bool:
    """
    Check if we are currently in a marimo notebook.

    Returns
    -------
    bool
        True if we are running in a marimo notebook environment, False otherwise.
    """

    return "marimo" in sys.modules


def check_jupyter() -> bool:
    """
    Check if we are currently in a jupyter notebook or IPython shell.

    Returns
    -------
    bool
        True if we are running in a jupyter notebook environment or IPython shell, False otherwise.
    """

    try:
        from IPython import get_ipython  # noqa: PLC0415  # pyright: ignore[reportAttributeAccessIssue]

        return get_ipython() is not None
    except (ImportError, NameError):
        return False


def is_hex_color(value: str) -> bool:
    """
    Check if a value is an hexadecimal color code.

    Parameters
    ----------
    value : str
        Value to be checked.

    Returns
    -------
    bool
        True if the value is an hexadecimal color code.
    """
    match = re.fullmatch(r"#([0-9a-f]{6}|[0-9a-f]{3})", value, flags=re.IGNORECASE)
    return match is not None


def is_icon_url(value: str) -> bool:
    """
    Check if a value is an icon URL.

    Parameters
    ----------
    value : str
        Value to be checked.

    Returns
    -------
    bool
        True if the value is an icon URL.
    """
    res = re.search(r"^(https?:|data:)", value, flags=re.IGNORECASE)
    return res is not None


def mime_type_from_url(url: str) -> str:
    extension_to_mime = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
    }

    # Extract the file extension from the URL
    ext = Path(url).suffix.lower()

    if ext not in extension_to_mime.keys():
        msg = f"Unknown image extension: {ext}."
        raise ValueError(msg)

    return extension_to_mime.get(ext, "")


def icon_url_to_data_uri(image_url: str) -> str:
    if image_url.startswith("data:"):
        return image_url
    elif image_url.startswith("http"):
        response = requests.get(image_url, timeout=5000)
        if response.status_code != 200:  # noqa: PLR2004
            msg = f"Failed to fetch icon at {image_url} : HTTP {response.status_code}"
            raise ValueError(msg)

        image_data = response.content
    else:
        img_file = Path(image_url)
        if not img_file.exists():
            msg = f"Icon file {image_url} not found"
            raise FileNotFoundError(msg)
        image_data = img_file.read_bytes()

    mime_type = mime_type_from_url(image_url)

    # Encode the image data in base64
    base64_data = base64.b64encode(image_data).decode("utf-8")

    data_uri = f"data:{mime_type};base64,{base64_data}"
    return data_uri

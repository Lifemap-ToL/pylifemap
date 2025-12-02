"""
Lifemap anywidget objects.
"""

import pathlib

import anywidget
import traitlets

from pylifemap.data.serialization import serialize_data

# Output directory for bundled js and css files
BUNDLER_OUTPUT_DIR = pathlib.Path(__file__).parent / "static"


class LifemapWidget(anywidget.AnyWidget):
    """
    Lifemap widget class.

    Attributes
    ----------
    data
        Widget data dictionary traitlet.
    layers
        Widget layers list traitlet.
    options
        Widget options dict traitlet.
    width
        Widget width string traitlet.
    height
        Widget height string traitlet.
    """

    # traitlets
    data = traitlets.Dict().tag(sync=True)
    layers = traitlets.List().tag(sync=True)
    options = traitlets.Dict().tag(sync=True)
    color_ranges = traitlets.Dict().tag(sync=True)
    width = traitlets.Unicode().tag(sync=True)
    height = traitlets.Unicode().tag(sync=True)

    def __init__(
        self, data: dict, layers: list, options: dict, color_ranges: dict, width: str, height: str
    ) -> None:
        """
        Widget class constructor.

        Parameters
        ----------
        data : dict
            Widget data dictionary.
        layers : list
            Widget layers list.
        options : dict
            Widget options dictionary.
        options : dict
            Color ranges dictionary.
        width : str
            Widget width as CSS string.
        height : str
            Widget height as CSS string.
        """
        data = {k: serialize_data(v) for k, v in data.items()}
        super().__init__(
            data=data, layers=layers, options=options, color_ranges=color_ranges, width=width, height=height
        )


class LifemapWidgetDeck(LifemapWidget):
    # Static JS and CSS bundled files with deck.gl
    _esm = pathlib.Path(BUNDLER_OUTPUT_DIR / "deck" / "widget.js")
    _css = pathlib.Path(BUNDLER_OUTPUT_DIR / "deck" / "widget.css")


class LifemapWidgetNoDeck(LifemapWidget):
    # Static JS and CSS bundled files without deck.gl
    _esm = pathlib.Path(BUNDLER_OUTPUT_DIR / "nodeck" / "widget.js")
    _css = pathlib.Path(BUNDLER_OUTPUT_DIR / "nodeck" / "widget.css")

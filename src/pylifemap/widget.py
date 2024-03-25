"""
Lifemap anywidget objects.
"""

import pathlib

import anywidget
import traitlets

BUNDLER_OUTPUT_DIR = pathlib.Path(__file__).parent / "static"


class LifemapWidget(anywidget.AnyWidget):
    _esm = anywidget._file_contents.FileContents(  # type: ignore
        BUNDLER_OUTPUT_DIR / "widget.js", start_thread=False
    )
    _css = anywidget._file_contents.FileContents(  # type: ignore
        BUNDLER_OUTPUT_DIR / "widget.css", start_thread=False
    )
    # traitlets
    data = traitlets.Dict().tag(sync=True)
    layers = traitlets.List().tag(sync=True)
    options = traitlets.Dict().tag(sync=True)
    width = traitlets.Unicode().tag(sync=True)
    height = traitlets.Unicode().tag(sync=True)

    def __init__(self, data, layers, options, width, height):
        super().__init__(
            data=data, layers=layers, options=options, width=width, height=height
        )

    # @traitlets.validate("layers")
    # def _validate_layers(self, proposal):
    #     new_layers = proposal["value"]
    #     return new_layers

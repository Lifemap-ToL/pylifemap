from pylifemap.data.lifemap_data import LifemapData


class LayersBase:
    def __init__(self):
        self.data = None
        self._layers = []
        self._layers_data = {}
        self._layers_counter = 0
        self._color_ranges = {}

    def _process_options(self, options: dict) -> tuple[dict, LifemapData]:
        """
        Process a layer options dictionary.

        The method increments layer counter, generates a layer id and deletes a `self`
        option.

        Parameters
        ----------
        options : dict
            Options dictionary.

        Returns
        -------
        dict
            Processed dictionary.
        """
        self._layers_counter += 1
        options["id"] = f"layer{self._layers_counter}"
        del options["self"]
        if options["data"] is not None:
            taxid_col = options["taxid_col"] if options["taxid_col"] is not None else "taxid"
            data = LifemapData(options["data"], taxid_col=taxid_col)
            del options["data"]
        else:
            data = self.data
        if data is None:
            msg = "Layer doesn't have any data"
            raise ValueError(msg)
        return options, data

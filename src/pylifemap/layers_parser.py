from typing import Any

from pylifemap.serialize import serialize_data


class LayersParser:
    def __init__(self, layers: list):
        self.layers = layers
        self.data = []

    def data_cache_index(self, data: Any) -> int | None:
        """Returns the index of a data object in the data cache.

        Args:
            data (Any): a data object (DataFeame, GeoJson...)

        Returns:
            Optional[int]: index of the data object in the cache, or None if absent.
        """
        index = [i for i, d in enumerate(self.data) if d is data]
        if len(index) == 1:
            return index[0]
        return None

    def parse_layer(self, layer: dict) -> dict:
        data = layer["data"]
        index = self.data_cache_index(data)
        if index is None:
            self.data.append(data)
            layer["data"] = len(self.data) - 1
        else:
            layer["data"] = index
        return layer

    def parse(self) -> tuple[list, list]:
        defs = [self.parse_layer(layer) for layer in self.layers]
        data = [serialize_data(d) for d in self.data]
        return data, defs

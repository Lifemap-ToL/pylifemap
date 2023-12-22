from pylifemap.serialize import serialize_data


class LayersParser:
    def __init__(self, layers, data):
        self.layers = layers
        self.data = data

    def parse_layer_points(self, layer):
        layer["data"] = serialize_data(self.data)
        return layer

    def parse_layer(self, layer):
        if layer["layer"] == "points":
            return self.parse_layer_points(layer)

    def parse(self):
        return [self.parse_layer(layer) for layer in self.layers]

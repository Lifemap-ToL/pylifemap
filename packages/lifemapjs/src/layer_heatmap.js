import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { guidGenerator } from "./utils";

export function layer_heatmap(map, data, options = {}) {
    let {
        id = undefined,
        x_col = "pylifemap_x",
        y_col = "pylifemap_y",
        radius = 30,
        intensity = 5,
        threshold = 0.05,
        opacity = 0.5,
        color_range = undefined,
    } = options;

    id = `lifemap-ol-${id ?? guidGenerator()}`;

    const layer = new HeatmapLayer({
        data: data,
        id: id,
        pickable: false,
        getPosition: (d) => [d[x_col], d[y_col]],
        getWeight: 1,
        radiusPixels: radius,
        intensity: intensity,
        threshold: threshold,
        opacity: opacity,
        colorRange: color_range ?? [
            [255, 255, 178],
            [254, 217, 118],
            [254, 178, 76],
            [253, 141, 60],
            [240, 59, 32],
            [189, 0, 38],
        ],
        debounceTimeout: 50,
    });

    layer.lifemap_ol_id = id;
    return layer;
}

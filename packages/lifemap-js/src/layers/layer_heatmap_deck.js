import { guidGenerator } from "../utils"
import { toLonLat } from "ol/proj"

export async function layer_heatmap_deck(id, data, options = {}) {
    let {
        x_col = "pylifemap_x",
        y_col = "pylifemap_y",
        radius = 30,
        intensity = 5,
        threshold = 0.05,
        opacity = 0.5,
        color_range = undefined,
    } = options

    id = `lifemap-ol-${id ?? guidGenerator()}`

    const aggregation_layers = await import("@deck.gl/aggregation-layers")

    const layer = new aggregation_layers.HeatmapLayer({
        data: data,
        id: id,
        pickable: false,
        getPosition: (d) => toLonLat([d["pylifemap_x"], d["pylifemap_y"]]),
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
    })

    layer.lifemap_ol_id = id
    return layer
}

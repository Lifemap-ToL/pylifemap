//import { ScreenGridLayer } from "@deck.gl/aggregation-layers"
import { guidGenerator } from "../utils"
import { toLonLat } from "ol/proj"

export async function layer_screengrid(data, options = {}) {
    let { id = undefined, cell_size = 30, opacity = 0.5, extruded = false } = options

    id = `lifemap-ol-${id ?? guidGenerator()}`

    const aggregation_layers = await import("@deck.gl/aggregation-layers")

    const layer = new aggregation_layers.ScreenGridLayer({
        data: data,
        id: id,
        pickable: false,
        getPosition: (d) => toLonLat([d["pylifemap_x"], d["pylifemap_y"]]),
        getWeight: 1,
        cellSizePixels: cell_size,
        extruded: extruded,
        opacity: opacity,
    })

    layer.lifemap_ol_id = id
    return layer
}

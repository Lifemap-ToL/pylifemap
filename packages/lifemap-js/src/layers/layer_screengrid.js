//import { ScreenGridLayer } from "@deck.gl/aggregation-layers"
import { guidGenerator } from "../utils"
import { toLonLat } from "ol/proj"

export class ScreengridLayer {
    constructor(id, data, options = {}) {
        let { cell_size = 30, opacity = 0.5, extruded = false } = options

        Object.assign(this, { cell_size, opacity, extruded })

        this.id = `lifemap-deck-${id ?? guidGenerator()}`
        this.data = data

        this.is_webgl = true
        this.type = "deck"

        this.layers = []
    }

    async init() {
        const aggregation_layers = await import("@deck.gl/aggregation-layers")

        const layer = new aggregation_layers.ScreenGridLayer({
            data: this.data,
            id: this.id,
            pickable: false,
            getPosition: (d) => toLonLat([d["pylifemap_x"], d["pylifemap_y"]]),
            getWeight: 1,
            cellSizePixels: this.cell_size,
            extruded: this.extruded,
            opacity: this.opacity,
        })

        this.layers.push(layer)
    }
}

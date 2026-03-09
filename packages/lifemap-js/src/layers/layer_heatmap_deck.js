import { guidGenerator } from "../utils"
import { toLonLat } from "ol/proj"

export class HeatmapDeckLayer {
    constructor(id, data, options = {}) {
        let {
            radius = 30,
            intensity = 5,
            threshold = 0.05,
            opacity = 0.5,
            color_range = undefined,
        } = options

        Object.assign(this, { radius, intensity, threshold, opacity, color_range })

        this.id = id
        this.data = data

        this.is_webgl = true
        this.type = "deck"

        this.layers = []
    }

    async init() {
        const aggregation_layers = await import("@deck.gl/aggregation-layers")

        const layer = new aggregation_layers.HeatmapLayer({
            data: this.data,
            id: this.id,
            pickable: false,
            getPosition: (d) => toLonLat([d["pylifemap_x"], d["pylifemap_y"]]),
            getWeight: 1,
            radiusPixels: this.radius,
            intensity: this.intensity,
            threshold: this.threshold,
            opacity: this.opacity,
            colorRange: this.color_range ?? [
                [255, 255, 178],
                [254, 217, 118],
                [254, 178, 76],
                [253, 141, 60],
                [240, 59, 32],
                [189, 0, 38],
            ],
            debounceTimeout: 50,
        })

        this.layers.push(layer)
    }
}

import { is_data_column, guidGenerator } from "../utils"
import { toLonLat } from "ol/proj"

import * as d3 from "d3"

export class ArcsDeckLayer {
    constructor(id, data, options = {}) {
        let {
            width = null,
            color = null,
            opacity = 0.8,
            height = 0.2,
            tilt = 45,
            n_segments = 100,
            source_color = [255, 0, 0, 255],
            dest_color = [255, 255, 0, 255],
            width_range = [1, 20],
        } = options

        Object.assign(this, {
            width,
            color,
            opacity,
            height,
            tilt,
            n_segments,
            source_color,
            dest_color,
            width_range,
        })

        this.id = `lifemap-deck-${id ?? guidGenerator()}`
        this.data = data

        this.is_webgl = true
        this.type = "deck"

        // Check if width is a fixed width or a data column
        this.width_is_column = is_data_column(this.data, this.width)

        this.layers = []
    }

    async init() {
        const base_deck_layers = await import("@deck.gl/layers")

        const layer = new base_deck_layers.ArcLayer({
            data: this.data,
            id: this.id,
            getSourcePosition: (d) => toLonLat([d["pylifemap_x"], d["pylifemap_y"]]),
            getTargetPosition: (d) =>
                toLonLat([d["pylifemap_dest_x"], d["pylifemap_dest_y"]]),
            getSourceColor: this.source_color,
            getTargetColor: this.dest_color,
            numSegments: this.n_segments,
            getWidth: this.get_width_fn(),
            getHeight: this.height,
            getTilt: this.tilt,
            opacity: this.opacity,
            greatCircle: false,
            pickable: true,
        })

        this.layers.push(layer)
    }

    get_width_fn() {
        if (!this.width_is_column) {
            return this.width
        }
        const min_domain = d3.min(this.data, (d) => Number(d[this.width]))
        const max_domain = d3.max(this.data, (d) => Number(d[this.width]))
        const [min_range, max_range] = this.width_range

        return (d) =>
            min_range +
            ((Number(d[this.width]) - min_domain) / (max_domain - min_domain)) *
                (max_range - min_range)
    }
}

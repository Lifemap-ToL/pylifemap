import { guidGenerator } from "../utils"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import Vector from "ol/source/Vector.js"
import OlHeatmapLayer from "ol/layer/Heatmap.js"

export class HeatmapLayer {
    constructor(id, data, options = {}) {
        let {
            radius = 5.0,
            blur = 5.0,
            opacity = 1.0,
            gradient = [
                "#4675ed",
                "#39a2fc",
                "#1bcfd4",
                "#24eca6",
                "#61fc6c",
                "#a4fc3b",
                "#d1e834",
                "#f3363a",
            ],
        } = options

        Object.assign(this, { radius, blur, opacity, gradient })

        this.id = `lifemap-ol-${id ?? guidGenerator()}`
        this.data = data

        this.is_webgl = false
        this.type = "ol"

        this.layers = []

        this.layers.push(this.create_layer())
    }

    create_layer() {
        // Initialize source
        const create_feature_fn = this.get_create_feature_fn()
        const source = new Vector({
            features: this.data.map(create_feature_fn),
            useSpatialIndex: false,
        })

        // Layer definition
        const layer = new OlHeatmapLayer({
            source: source,
            blur: this.blur,
            radius: this.radius,
            weight: 1.0,
            gradient: this.gradient,
            opacity: this.opacity,
        })
        layer.id = this.id

        return layer
    }

    get_create_feature_fn() {
        return (d) =>
            new Feature({
                geometry: new Point([d["pylifemap_x"], d["pylifemap_y"]]),
            })
    }
}

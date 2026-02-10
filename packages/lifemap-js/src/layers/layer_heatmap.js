import { guidGenerator } from "../utils"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import Vector from "ol/source/Vector.js"
import HeatmapLayer from "ol/layer/Heatmap.js"

export function layer_heatmap(data, options = {}) {
    let {
        id = null,
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

    id = `lifemap-ol-${id ?? guidGenerator()}`

    function create_feature(d) {
        return new Feature({
            geometry: new Point([d["pylifemap_x"], d["pylifemap_y"]]),
        })
    }
    const source = new Vector({
        features: data.map(create_feature),
        useSpatialIndex: false,
    })

    // Layer definition
    const layer = new HeatmapLayer({
        source: source,
        blur: blur,
        radius: radius,
        weight: 1.0,
        gradient: gradient,
    })
    layer.setOpacity(opacity)

    layer.lifemap_ol_id = id
    layer.lifemap_ol_scales = []
    layer.is_webgl = true

    return layer
}

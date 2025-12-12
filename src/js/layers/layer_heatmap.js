import { guidGenerator } from "../utils"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import Vector from "ol/source/Vector.js"
import HeatmapLayer from "ol/layer/Heatmap.js"
import { fromLonLat } from "ol/proj.js"

export function layer_heatmap(data, options = {}) {
    let {
        id = null,
        x_col = "pylifemap_x",
        y_col = "pylifemap_y",
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

    const n_features = data.length
    const features = new Array(n_features)
    for (let i = 0; i < n_features; i++) {
        let line = data[i]
        const coordinates = fromLonLat([line[x_col], line[y_col]])
        features[i] = new Feature({
            geometry: new Point(coordinates),
        })
    }
    const source = new Vector({
        features: features,
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

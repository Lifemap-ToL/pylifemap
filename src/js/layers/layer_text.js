import { guidGenerator } from "../utils"
import { setup_lazy_loading } from "../data/lazy_loading"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import VectorSource from "ol/source/Vector"
import VectorLayer from "ol/layer/Vector.js"
import { Style, Fill, Stroke } from "ol/style.js"
import Text from "ol/style/Text.js"

const TEXT_COLOR = "rgba(255, 255, 255, 1)"
const TEXT_STROKE_COLOR = "rgba(0, 0, 0, 1)"

function create_text(text, font_family, font_size, color, stroke) {
    const text_font = `${font_size}px ${font_family}`
    const text_obj = [text, text_font]

    const text_style = new Text({
        fill: new Fill({ color: color }),
        stroke: new Stroke({ width: 2, color: stroke }),
        text: text_obj,
        offsetY: 10,
        textBaseline: "top",
    })

    return text_style
}

export function layer_text(map, data, options = {}) {
    let {
        id = null,
        text = null,
        font_family = "Segoe UI, Helvetica, sans-serif",
        font_size = 12,
        color = TEXT_COLOR,
        stroke = TEXT_STROKE_COLOR,
        opacity = 1.0,
        declutter = true,
        lazy = true,
        lazy_zoom = 15,
    } = options

    id = `lifemap-ol-${id ?? guidGenerator()}`

    // Create features
    function create_feature(d) {
        return new Feature({
            geometry: new Point([d["pylifemap_x"]], d["pylifemap_y"]),
            text: d[text],
        })
    }

    // Initialize source
    const source = new VectorSource({ useSpatialIndex: false })
    if (!lazy) {
        const features = data.map(create_feature)
        source.addFeatures(features)
    }

    const style_function = (feature) => {
        const style = new Style({
            text: create_text(feature.get("text"), font_family, font_size, color, stroke),
        })

        return style
    }

    // Create layer
    const layer = new VectorLayer({
        source: source,
        style: style_function,
        declutter: declutter ? id : false,
        opacity: opacity,
        zIndex: 5,
    })

    // Lazy loading
    if (lazy) {
        setup_lazy_loading({
            map: map,
            data: data,
            source: source,
            create_feature_fn: create_feature,
            lazy_zoom: lazy_zoom,
            type: "points",
        })
    }

    layer.lifemap_ol_id = id

    return layer
}

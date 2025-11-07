import { fromLonLat } from "ol/proj"
import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import { Vector } from "ol/source.js"
import VectorSource from "ol/source/Vector"
import VectorLayer from "ol/layer/Vector.js"
import { Style, Fill, Stroke, Icon } from "ol/style.js"
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

export function layer_icons(data, options = {}) {
    let {
        id = null,
        width = null,
        height = null,
        color = null,
        x_offset = 0,
        y_offset = 0,
        x_col = "pylifemap_x",
        y_col = "pylifemap_y",
        icon = null,
        x_anchor = 0.5,
        y_anchor = 0.5,
        opacity = 1.0,
    } = options

    id = `lifemap-ol-${id ?? guidGenerator()}`

    // Check if icon is a fixed URL or a data column
    let icon_col = null
    if (typeof icon === "string" && Object.keys(data[0]).includes(icon)) {
        icon_col = icon
    }

    // Create features
    const n_features = data.length
    const features = new Array(n_features)
    for (let i = 0; i < n_features; i++) {
        let line = data[i]
        const coordinates = fromLonLat([line[x_col], line[y_col]])
        features[i] = new Feature({
            geometry: new Point(coordinates),
            icon: icon_col === null ? icon : line[icon_col],
        })
    }
    const source = new VectorSource({
        features: features,
    })

    const style_function = (feature) => {
        const style = new Style({
            image: new Icon({
                anchor: [x_anchor, y_anchor],
                anchorXUnits: "fraction",
                anchorYUnitsUnits: "fraction",
                width: width ?? undefined,
                height: height ?? undefined,
                displacement: [x_offset, y_offset],
                src: feature.get("icon"),
                color: color ?? undefined,
            }),
        })

        return style
    }

    const layer = new VectorLayer({
        source: source,
        style: style_function,
        declutter: id,
        opacity: opacity,
    })

    layer.lifemap_ol_id = id

    return layer
}

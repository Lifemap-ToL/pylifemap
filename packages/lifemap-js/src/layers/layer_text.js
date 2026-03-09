import { guidGenerator } from "../utils"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import VectorSource from "ol/source/Vector"
import VectorLayer from "ol/layer/Vector.js"
import { Style, Fill, Stroke } from "ol/style.js"
import Text from "ol/style/Text.js"

const DEFAULT_TEXT_COLOR = "rgba(255, 255, 255, 1)"
const DEFAULT_TEXT_STROKE_COLOR = "rgba(0, 0, 0, 1)"

export class TextLayer {
    constructor(id, map, data, options = {}) {
        let {
            text = null,
            font_family = "Segoe UI, Helvetica, sans-serif",
            font_size = 12,
            color = null,
            stroke = null,
            opacity = 1.0,
            declutter = true,
            lazy = true,
            lazy_zoom = 15,
        } = options

        Object.assign(this, {
            text,
            font_family,
            font_size,
            color,
            stroke,
            opacity,
            declutter,
            lazy,
            lazy_zoom,
        })

        this.id = `lifemap-ol-${id ?? guidGenerator()}`
        this.map = map
        this.data = data

        this.is_webgl = false
        this.type = "ol"

        this.layers = []

        this.layers.push(this.create_layer())
    }

    create_layer() {
        // Initialize source
        const source = new VectorSource({ useSpatialIndex: false })

        // Layer definition
        const layer = new VectorLayer({
            source: source,
            style: this.get_style(),
            declutter: this.declutter ? this.id : false,
            opacity: this.opacity,
            zIndex: 5,
        })
        layer.id = this.id

        // Features creation
        const create_feature_fn = this.get_create_feature_fn()
        if (this.lazy) {
            this.map.setup_lazy_loading({
                data: this.data,
                source: source,
                create_feature_fn: create_feature_fn,
                lazy_zoom: this.lazy_zoom,
                type: "points",
            })
        } else {
            source.addFeatures(this.data.map(create_feature_fn))
        }
        console.log(source.getFeatures())
        return layer
    }

    get_create_feature_fn() {
        return (d) =>
            new Feature({
                geometry: new Point([d["pylifemap_x"], d["pylifemap_y"]]),
                text: d[this.text],
            })
    }

    get_style() {
        const text_font = `${this.font_size}px ${this.font_family}`
        return (feature) =>
            new Style({
                text: new Text({
                    fill: new Fill({ color: this.color ?? DEFAULT_TEXT_COLOR }),
                    stroke: new Stroke({
                        width: 2,
                        color: this.stroke ?? DEFAULT_TEXT_STROKE_COLOR,
                    }),
                    text: [feature.get("text"), text_font],
                    offsetY: 10,
                    textBaseline: "top",
                }),
            })
    }
}

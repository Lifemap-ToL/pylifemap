import {
    guidGenerator,
    set_hover_event,
    DEFAULT_CAT_SCHEME,
    DEFAULT_NUM_SCHEME,
} from "../utils"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import WebGLVectorLayer from "ol/layer/WebGLVector.js"
import { fromLonLat } from "ol/proj.js"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"
import VectorSource from "ol/source/Vector.js"
import { get_popup_title } from "../api"
import { set_popup_event } from "../elements/popup"

export function layer_points(map, data, options = {}) {
    let {
        id = null,
        x_col = "pylifemap_x",
        y_col = "pylifemap_y",
        radius = null,
        fill = null,
        fill_cat = null,
        label = null,
        scheme = null,
        opacity = 0.8,
        popup = false,
        hover = false,
        radius_range = [1, 20],
    } = options

    let scales = []
    id = `lifemap-ol-${id ?? guidGenerator()}`

    // Check if radius is a fixed radius or a data column
    let radius_col = null
    if (typeof radius === "string" && Object.keys(data[0]).includes(radius)) {
        radius_col = radius
    }

    // Check if fill is a fixed color or a data column
    let fill_col = null
    if (typeof fill === "string" && Object.keys(data[0]).includes(fill)) {
        fill_col = fill
    }

    // Radius function
    let get_radius_col_fn = function (data, col) {
        if (col == null) {
            return null
        }
        const min_domain = d3.min(data, (d) => Number(d[col]))
        const max_domain = d3.max(data, (d) => Number(d[col]))
        const [min_range, max_range] = radius_range

        const fn = (d) => {
            return (
                min_range +
                ((Number(d) - min_domain) / (max_domain - min_domain)) *
                    (max_range - min_range)
            )
        }
        return fn
    }

    // Fill color function
    let get_fill_col_fn = function (data, col, cat) {
        if (col == null) {
            return null
        }
        // Determine if scale is categorical or linear
        if (cat === null) {
            cat = !(
                ["number", "bigint"].includes(typeof data[0][col]) &
                ([...new Set(data.map((d) => d[col]))].length > 10)
            )
        }
        let fn
        // Linear color scale
        if (!cat) {
            const max_value = d3.max(data, (d) => Number(d[col]))
            const min_value = d3.min(data, (d) => Number(d[col]))
            scheme = scheme ?? DEFAULT_NUM_SCHEME
            const scale = {
                color: {
                    type: "linear",
                    scheme: scheme,
                    domain: [min_value, max_value],
                },
                className: "lifemap-ol-lin-legend",
                label: label ?? col,
            }
            scales.push(scale)
            fn = (d) => Plot.scale(scale).apply(Number(d))
        }
        // Categorical color scale
        else {
            scheme = scheme ?? DEFAULT_CAT_SCHEME
            const domain = [...new Set(data.map((d) => d[col]))].sort()
            const scale = {
                color: { type: "categorical", scheme: scheme, domain: domain },
                columns: 1,
                className: "lifemap-ol-cat-legend",
                label: label ?? col,
            }
            scales.push(scale)
            fn = (d) => Plot.scale(scale).apply(d)
        }
        return fn
    }

    // Create features
    const n_features = data.length
    const features = new Array(n_features)
    const radius_col_fn = get_radius_col_fn(data, radius_col)
    const fill_col_fn = get_fill_col_fn(data, fill_col, fill_cat)
    for (let i = 0; i < n_features; i++) {
        let line = data[i]
        const coordinates = fromLonLat([line[x_col], line[y_col]])
        features[i] = new Feature({
            geometry: new Point(coordinates),
            data: line,
        })
        if (radius_col_fn != null) {
            features[i].set("radius_col", radius_col_fn(line[radius_col]))
        }
        if (fill_col != null) {
            features[i].set("fill_col", fill_col_fn(line[fill_col]))
        }
    }
    const source = new VectorSource({
        features: features,
    })

    // Radius style
    let circle_radius
    if (radius_col !== null) {
        circle_radius = ["get", "radius_col"]
    } else {
        circle_radius = radius ?? 5
    }
    // Fill style
    let circle_fill_color
    if (fill_col !== null) {
        circle_fill_color = ["get", "fill_col"]
    } else {
        circle_fill_color = fill ?? "#DD0000"
    }
    if (hover) {
        circle_fill_color = ["match", ["get", "hover"], 1, "#ff0000", circle_fill_color]
    }

    const style = {
        "circle-radius": circle_radius,
        "circle-fill-color": circle_fill_color,
    }

    // Layer definition
    const layer = new WebGLVectorLayer({
        source: source,
        style: style,
        disableHitDetection: false,
        declutter: false,
    })
    layer.setOpacity(opacity)

    // Hover
    if (hover) {
        let selected_feature = null
        set_hover_event(map, id, selected_feature)
    }

    // Popup
    if (popup) {
        const content_fn = async (feature) => {
            const taxid = feature.get("data")["taxid"]
            let content = await get_popup_title(taxid)

            content += "<table><tbody>"
            content +=
                radius_col !== null && radius_col != fill_col
                    ? `<tr><td class='right'><strong>${radius_col}:</strong></td><td>${feature.get("data")[radius_col]}</td></tr>`
                    : ""
            content += fill_col
                ? `<tr><td class='right'><strong>${fill_col}:</strong></td><td>${feature.get("data")[fill_col]}</td></tr>`
                : ""
            content += "</tbody></table>"
            return content
        }
        const coordinates_fn = (feature) => [
            feature.get("data").pylifemap_x,
            feature.get("data").pylifemap_y,
        ]
        set_popup_event(map, id, coordinates_fn, content_fn)
    }
    layer.lifemap_ol_id = id
    layer.lifemap_ol_scales = scales
    layer.is_webgl = true
    return layer
}

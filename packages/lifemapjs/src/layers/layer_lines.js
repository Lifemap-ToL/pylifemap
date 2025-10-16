import {
    guidGenerator,
    set_popup_event,
    set_hover_event,
    DEFAULT_NUM_SCHEME,
} from "../utils"

import Feature from "ol/Feature.js"
import WebGLVectorLayer from "ol/layer/WebGLVector.js"
import { fromLonLat } from "ol/proj.js"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"
import VectorSource from "ol/source/Vector.js"
import { LineString } from "ol/geom"

export function layer_lines(map, data, options = {}) {
    let {
        id = null,
        x_col0 = "pylifemap_x0",
        y_col0 = "pylifemap_y0",
        x_col1 = "pylifemap_x1",
        y_col1 = "pylifemap_y1",
        width = null,
        width_col = null,
        color_col = null,
        label = null,
        scheme = null,
        opacity = 0.8,
        popup = false,
        hover = false,
        width_range = [1, 20],
    } = options

    let scales = []

    id = `lifemap-ol-${id ?? guidGenerator()}`

    // Width function
    let get_width_col_fn = function (data, col) {
        if (col == null) {
            return null
        }
        const min_domain = d3.min(data, (d) => Number(d[col]))
        const max_domain = d3.max(data, (d) => Number(d[col]))
        const [min_range, max_range] = width_range

        const fn = (d) => {
            return (
                min_range +
                ((Number(d) - min_domain) / (max_domain - min_domain)) *
                    (max_range - min_range)
            )
        }
        return fn
    }

    // Color function
    let get_color_col_fn = function (data, col) {
        if (col == null) {
            return null
        }
        let fn
        // Linear color scale
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
        return fn
    }

    // Create features
    const n_features = data.length
    const features = new Array(n_features)
    const width_col_fn = get_width_col_fn(data, width_col)
    const color_col_fn = get_color_col_fn(data, color_col)

    for (let i = 0; i < n_features; i++) {
        let line = data[i]
        features[i] = new Feature({
            geometry: new LineString([
                fromLonLat([line[x_col0], line[y_col0]]),
                fromLonLat([line[x_col1], line[y_col1]]),
            ]),
            data: line,
        })
        if (width_col_fn != null) {
            features[i].set("width_col", width_col_fn(line[width_col]))
        }
        if (color_col != null) {
            features[i].set("color_col", color_col_fn(line[color_col]))
        }
    }
    const source = new VectorSource({
        features: features,
    })

    // Width style
    let stroke_width
    if (width_col !== null) {
        stroke_width = ["get", "width_col"]
    } else {
        stroke_width = width
    }
    // Color style
    let stroke_color
    if (color_col !== null) {
        stroke_color = ["get", "color_col"]
    } else {
        stroke_color = scheme ?? "#DD0000"
    }
    if (hover) {
        stroke_color = ["match", ["get", "hover"], 1, "#ff0000", stroke_color]
    }

    const style = {
        "stroke-width": stroke_width,
        "stroke-color": stroke_color,
        "stroke-line-cap": "round",
        "stroke-line-join": "round",
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
        const content_fn = (feature) => {
            let content = `<table><tbody><tr><td class='right'><strong>TaxId:</td><td>${feature.get("data").taxid}</td></tr>`
            content +=
                width_col !== null && width_col != color_col
                    ? `<tr><td class='right'><strong>${width_col}:</strong></td><td>${feature.get("data")[width_col]}</td></tr>`
                    : ""
            content += color_col
                ? `<tr><td class='right'><strong>${color_col}:</strong></td><td>${feature.get("data")[color_col]}</td></tr>`
                : ""
            content += "</tbody></table>"
            return content
        }
        const coordinates_fn = (feature) => [
            (feature.get("data").pylifemap_x0 + feature.get("data").pylifemap_x1) / 2,
            (feature.get("data").pylifemap_y0 + feature.get("data").pylifemap_y1) / 2,
        ]
        const offset = [0, -5]
        set_popup_event(map, id, coordinates_fn, content_fn, offset)
    }

    layer.lifemap_ol_id = id
    layer.lifemap_ol_scales = scales
    layer.is_webgl = true
    return layer
}

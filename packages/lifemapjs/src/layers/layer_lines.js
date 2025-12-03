import { guidGenerator, set_hover_event, DEFAULT_NUM_SCHEME } from "../utils"
import { get_popup_title } from "../api"
import { setup_lazy_loading } from "../lazy_loading"

import Feature from "ol/Feature.js"
import WebGLVectorLayer from "ol/layer/WebGLVector.js"
import { fromLonLat } from "ol/proj.js"
import { set_popup_event } from "../elements/popup"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"
import VectorSource from "ol/source/Vector.js"
import { LineString } from "ol/geom"

export function layer_lines(map, data, options = {}, color_ranges = {}) {
    let {
        id = null,
        x_col0 = "pylifemap_x0",
        y_col0 = "pylifemap_y0",
        x_col1 = "pylifemap_x1",
        y_col1 = "pylifemap_y1",
        width = null,
        color = null,
        label = null,
        scheme = null,
        opacity = 0.8,
        popup = false,
        popup_col = null,
        hover = false,
        lazy = false,
        lazy_zoom = 15,
        width_range = [1, 20],
    } = options

    let scales = []

    id = `lifemap-ol-${id ?? guidGenerator()}`

    // Check if width is a fixed width or a data column
    let width_col = null
    if (typeof width === "string" && Object.keys(data[0]).includes(width)) {
        width_col = width
    }

    // Check if color is a fixed color or a data column
    let color_col = null
    if (typeof color === "string" && Object.keys(data[0]).includes(color)) {
        color_col = color
    }

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
    let get_color_col_fn = function (data, col, color_ranges) {
        if (col == null) {
            return null
        }
        let fn, min_value, max_value
        // Linear color scale
        if (color_ranges[col] !== undefined) {
            min_value = color_ranges[col].min
            max_value = color_ranges[col].max
        } else {
            max_value = d3.max(data, (d) => Number(d[col]))
            min_value = d3.min(data, (d) => Number(d[col]))
        }
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
    function create_feature(d) {
        const feature = new Feature({
            geometry: new LineString([
                fromLonLat([d[x_col0], d[y_col0]]),
                fromLonLat([d[x_col1], d[y_col1]]),
            ]),
            data: d,
        })
        if (width_col_fn != null) {
            feature.set("width_col", width_col_fn(d[width_col]))
        }
        if (color_col != null) {
            feature.set("color_col", color_col_fn(d[color_col]))
        }
        return feature
    }

    // Initialize source
    const width_col_fn = get_width_col_fn(data, width_col)
    const color_col_fn = get_color_col_fn(data, color_col, color_ranges)
    const source = new VectorSource({})
    if (!lazy) {
        const features = data.map(create_feature)
        source.addFeatures(features)
    }

    // Width style
    let stroke_width
    if (width_col !== null) {
        stroke_width = ["get", "width_col"]
    } else {
        stroke_width = width ?? 3
    }
    // Color style
    let stroke_color
    if (color_col !== null) {
        stroke_color = ["get", "color_col"]
    } else {
        stroke_color = color ?? "#DD0000"
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
    })
    layer.setOpacity(opacity)

    // Lazy loading
    if (lazy) {
        setup_lazy_loading({
            map: map,
            data: data,
            source: source,
            create_feature_fn: create_feature,
            lazy_zoom: lazy_zoom,
            type: "lines",
        })
    }

    // Hover
    if (hover) {
        let selected_feature = null
        set_hover_event(map, id, selected_feature)
    }

    // Popup
    if (popup) {
        const content_fn = popup_col
            ? (feature) => feature.get("data")[popup_col]
            : async (feature) => {
                  const taxid = feature.get("data")["pylifemap_taxid"]
                  let content = await get_popup_title(taxid)

                  let table_content = ""
                  table_content +=
                      width_col !== null && width_col != color_col
                          ? `<tr><td class='right'><strong>${width_col}:</strong></td><td>${feature.get("data")[width_col]}</td></tr>`
                          : ""
                  table_content += color_col
                      ? `<tr><td class='right'><strong>${label ?? color_col}:</strong></td><td>${feature.get("data")[color_col]}</td></tr>`
                      : ""

                  if (table_content != "") {
                      content += `<table><tbody>${table_content}</tbody></table>`
                  }

                  return content
              }
        const coordinates_fn = (feature) => [
            (feature.get("data").pylifemap_x0 + feature.get("data").pylifemap_x1) / 2,
            (feature.get("data").pylifemap_y0 + feature.get("data").pylifemap_y1) / 2,
        ]
        const offset = [0, -5]
        set_popup_event(map, id, coordinates_fn, content_fn)
    }

    layer.lifemap_ol_id = id
    layer.lifemap_ol_scales = scales
    layer.is_webgl = true
    return layer
}

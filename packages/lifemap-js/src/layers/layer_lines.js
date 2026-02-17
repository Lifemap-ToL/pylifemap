import { guidGenerator, set_hover_event, DEFAULT_NUM_SCHEME } from "../utils"
import { get_popup_title } from "../data/api"
import { setup_lazy_loading } from "../data/lazy_loading"

import Feature from "ol/Feature.js"
import WebGLVectorLayer from "ol/layer/WebGLVector.js"
import { set_popup_event } from "../elements/popup"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"
import VectorSource from "ol/source/Vector.js"
import { LineString } from "ol/geom"

export function layer_lines(id, map, data, options = {}, color_ranges = {}) {
    let {
        width = null,
        color = null,
        label = null,
        scheme = null,
        opacity = 0.8,
        linetype = "solid",
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
        const plot_scale = Plot.scale(scale)
        fn = (d) => plot_scale.apply(Number(d))
        return fn
    }

    // Create feature function
    const width_col_fn = get_width_col_fn(data, width_col)
    const color_col_fn = get_color_col_fn(data, color_col, color_ranges)
    function create_feature(d) {
        return new Feature({
            geometry: new LineString([
                [d["pylifemap_x0"], d["pylifemap_y0"]],
                [d["pylifemap_x1"], d["pylifemap_y1"]],
            ]),
            data: popup ? d : null,
            width_col: width_col_fn != null ? width_col_fn(d[width_col]) : null,
            color_col: color_col_fn != null ? color_col_fn(d[color_col]) : null,
        })
    }

    // Initialize source
    const source = new VectorSource({ useSpatialIndex: !lazy || popup || hover })
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
    // Linedash style
    let stroke_line_dash = [0]
    switch (linetype) {
        case "dotted":
            stroke_line_dash = [3, 3, 3, 3]
            break
        case "smalldash":
            stroke_line_dash = [10, 10, 10, 10]
            break
        case "dashed":
            stroke_line_dash = [25, 10, 25, 10]
            break
    }

    const style = {
        "stroke-width": stroke_width,
        "stroke-color": stroke_color,
        "stroke-line-dash": stroke_line_dash,
        "stroke-line-dash-offset": 0,
        "stroke-line-cap": linetype == "solid" ? "round" : "butt",
        "stroke-line-join": "round",
    }

    // Layer definition
    const layer = new WebGLVectorLayer({
        source: source,
        style: style,
        disableHitDetection: !(popup || hover),
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

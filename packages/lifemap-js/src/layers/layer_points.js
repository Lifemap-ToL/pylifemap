import {
    guidGenerator,
    set_hover_event,
    DEFAULT_CAT_SCHEME,
    DEFAULT_NUM_SCHEME,
} from "../utils"
import { get_popup_title } from "../data/api"
import { set_popup_event } from "../elements/popup"
import { setup_lazy_loading } from "../data/lazy_loading"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import WebGLVectorLayer from "ol/layer/WebGLVector.js"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"
import VectorSource from "ol/source/Vector.js"

export function layer_points(id, map, data, options = {}, color_ranges = {}) {
    let {
        radius = null,
        fill = null,
        fill_cat = null,
        categories = null,
        label = null,
        scheme = null,
        opacity = 0.8,
        popup = false,
        popup_col = null,
        hover = false,
        lazy = false,
        lazy_zoom = 15,
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
    let get_fill_col_fn = function (data, col, cat, color_ranges) {
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
            let min_value, max_value
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
        }
        // Categorical color scale
        else {
            scheme = scheme ?? DEFAULT_CAT_SCHEME
            let domain = categories ?? [...new Set(data.map((d) => d[col]))].sort()
            domain = domain.map((d) => d.toString())
            const scale = {
                color: { type: "categorical", scheme: scheme, domain: domain },
                columns: 1,
                className: "lifemap-ol-cat-legend",
                label: label ?? col,
            }
            scales.push(scale)
            const plot_scale = Plot.scale(scale)
            fn = (d) => plot_scale.apply(d.toString())
        }
        return fn
    }

    // Create feature function
    const radius_col_fn = get_radius_col_fn(data, radius_col)
    const fill_col_fn = get_fill_col_fn(data, fill_col, fill_cat, color_ranges)
    function create_feature(d) {
        return new Feature({
            geometry: new Point([d["pylifemap_x"], d["pylifemap_y"]]),
            data: popup ? d : null,
            radius_col: radius_col_fn != null ? radius_col_fn(d[radius_col]) : null,
            fill_col: fill_col_fn != null ? fill_col_fn(d[fill_col]) : null,
        })
    }

    // Initialize source
    const source = new VectorSource({
        useSpatialIndex: !lazy || popup || hover,
    })
    if (!lazy) {
        const features = data.map(create_feature)
        source.addFeatures(features)
    }

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
            type: "points",
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
                      radius_col !== null && radius_col != fill_col
                          ? `<tr><td class='right'><strong>${radius_col}:</strong></td><td>${feature.get("data")[radius_col]}</td></tr>`
                          : ""
                  table_content += fill_col
                      ? `<tr><td class='right'><strong>${label ?? fill_col}:</strong></td><td>${feature.get("data")[fill_col]}</td></tr>`
                      : ""

                  if (table_content != "") {
                      content += `<table><tbody>${table_content}</tbody></table>`
                  }

                  return content
              }
        const coordinates_fn = (feature) => feature.getGeometry().getCoordinates()
        set_popup_event(map, id, coordinates_fn, content_fn)
    }
    layer.lifemap_ol_id = id
    layer.lifemap_ol_scales = scales
    layer.is_webgl = true
    return layer
}

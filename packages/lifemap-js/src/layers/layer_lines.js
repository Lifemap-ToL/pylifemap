import { guidGenerator, DEFAULT_NUM_SCHEME } from "../utils"
import { get_popup_title } from "../data/api"

import { is_data_column } from "../utils"

import Feature from "ol/Feature.js"
import WebGLVectorLayer from "ol/layer/WebGLVector.js"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"
import VectorSource from "ol/source/Vector.js"
import { LineString } from "ol/geom"

const DEFAULT_WIDTH = 3
const DEFAULT_COLOR = "#DD0000"

export class LinesLayer {
    constructor(id, map, data, options = {}, color_ranges = {}) {
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

        Object.assign(this, {
            width,
            color,
            label,
            scheme,
            opacity,
            linetype,
            popup,
            popup_col,
            hover,
            lazy,
            lazy_zoom,
            width_range,
        })

        this.id = `lifemap-ol-${id ?? guidGenerator()}`
        this.map = map
        this.data = data
        this.color_ranges = color_ranges
        this.label = this.label ?? this.color

        this.is_webgl = true
        this.type = "ol"

        this.scales = []
        this.layers = []

        // Check if width is a fixed width or a data column
        this.width_is_column = is_data_column(this.data, this.width)

        // Check if color is a fixed color or a data column
        this.color_is_column = is_data_column(this.data, this.color)

        this.layers.push(this.create_layer())
    }

    create_layer() {
        // Initialize source
        let source = new VectorSource({
            useSpatialIndex: !this.lazy || this.popup || this.hhover,
        })

        // Layer definition
        const layer = new WebGLVectorLayer({
            source: source,
            style: this.get_style(),
            disableHitDetection: !(this.popup || this.hover),
            opacity: this.opacity,
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
                type: "lines",
            })
        } else {
            source.addFeatures(this.data.map(create_feature_fn))
        }

        // Hover
        if (this.hover) {
            this.map.add_hover_event({ layer_id: layer.id, selected_feature: null })
        }
        layer.id = this.id

        // Popup
        if (this.popup) {
            const coordinates_fn = (feature) => [
                (feature.get("data").pylifemap_x +
                    feature.get("data").pylifemap_parent_x) /
                    2,
                (feature.get("data").pylifemap_y +
                    feature.get("data").pylifemap_parent_y) /
                    2,
            ]
            this.map.add_popup_event({
                layer_id: layer.id,
                coordinates_fn,
                content_fn: this.get_popup_content_fn(),
                offset: [0, -5],
            })
        }
        return layer
    }

    get_create_feature_fn() {
        const width_fn = this.get_width_fn()
        const color_fn = this.get_color_fn()
        return (d) =>
            new Feature({
                geometry: new LineString([
                    [d["pylifemap_x"], d["pylifemap_y"]],
                    [d["pylifemap_parent_x"], d["pylifemap_parent_y"]],
                ]),
                data: this.popup ? d : null,
                width: width_fn != null ? width_fn(d[this.width]) : null,
                color: color_fn != null ? color_fn(d[this.color]) : null,
            })
    }

    get_width_fn() {
        if (!this.width_is_column) {
            return null
        }
        const min_domain = d3.min(this.data, (d) => Number(d[this.width]))
        const max_domain = d3.max(this.data, (d) => Number(d[this.width]))
        const [min_range, max_range] = this.width_range

        return (d) =>
            min_range +
            ((Number(d) - min_domain) / (max_domain - min_domain)) *
                (max_range - min_range)
    }

    get_color_fn() {
        if (!this.color_is_column) {
            return null
        }
        let min_value, max_value
        // Linear color scale
        if (this.color_ranges[this.color] !== undefined) {
            min_value = this.color_ranges[this.color].min
            max_value = this.color_ranges[this.color].max
        } else {
            max_value = d3.max(this.data, (d) => Number(d[this.color]))
            min_value = d3.min(this.data, (d) => Number(d[this.color]))
        }
        const scheme = this.scheme ?? DEFAULT_NUM_SCHEME
        const scale = {
            color: {
                type: "linear",
                scheme: scheme,
                domain: [min_value, max_value],
            },
            className: "lifemap-ol-lin-legend",
            label: this.label,
        }
        this.scales.push(scale)
        const plot_scale = Plot.scale(scale)
        return (d) => plot_scale.apply(Number(d))
    }

    get_style() {
        // Width style
        const stroke_width = this.width_is_column
            ? ["get", "width"]
            : (this.width ?? DEFAULT_WIDTH)

        // Color style
        let stroke_color = this.color_is_column
            ? ["get", "color"]
            : (this.color ?? DEFAULT_COLOR)
        if (this.hover) {
            stroke_color = ["match", ["get", "hover"], 1, "#ff0000", stroke_color]
        }

        // Linedash style
        let stroke_line_dash = [0]
        switch (this.linetype) {
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

        return {
            "stroke-width": stroke_width,
            "stroke-color": stroke_color,
            "stroke-line-dash": stroke_line_dash,
            "stroke-line-dash-offset": 0,
            "stroke-line-cap": this.linetype == "solid" ? "round" : "butt",
            "stroke-line-join": "round",
        }
    }

    get_popup_content_fn() {
        return this.popup_col
            ? (feature) => feature.get("data")[this.popup_col]
            : async (feature) => {
                  const taxid = feature.get("data")["pylifemap_taxid"]
                  let content = await get_popup_title(taxid)

                  let table_content =
                      this.width_is_column && this.width != this.color
                          ? `<tr><td class='right'><strong>${this.width}:</strong></td><td>${feature.get("data")[this.width]}</td></tr>`
                          : ""
                  table_content += this.color_is_column
                      ? `<tr><td class='right'><strong>${this.label}:</strong></td><td>${feature.get("data")[this.color]}</td></tr>`
                      : ""

                  if (table_content != "") {
                      content += `<table><tbody>${table_content}</tbody></table>`
                  }

                  return content
              }
    }
}

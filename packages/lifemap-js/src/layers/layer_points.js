import { guidGenerator, DEFAULT_CAT_SCHEME, DEFAULT_NUM_SCHEME } from "../utils"
import { get_popup_title } from "../data/api"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import WebGLVectorLayer from "ol/layer/WebGLVector.js"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"
import VectorSource from "ol/source/Vector.js"
import { is_data_column, is_categorical_column } from "../utils"

const DEFAULT_RADIUS = 5
const DEFAULT_FILL = "#DD0000"

export class PointsLayer {
    constructor(id, map, data, options = {}, color_ranges = {}) {
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

        Object.assign(this, {
            radius,
            fill,
            fill_cat,
            categories,
            label,
            scheme,
            opacity,
            popup,
            popup_col,
            hover,
            lazy,
            lazy_zoom,
            radius_range,
        })

        this.id = `lifemap-ol-${id ?? guidGenerator()}`
        this.map = map
        this.data = data
        this.color_ranges = color_ranges
        this.label = this.label ?? this.fill

        this.is_webgl = true
        this.type = "ol"

        this.scales = []
        this.layers = []

        // Check if radius is a fixed radius or a data column
        this.radius_is_column = is_data_column(this.data, this.radius)

        // Check if fill is a fixed color or a data column
        this.fill_is_column = is_data_column(this.data, this.fill)

        this.layers.push(this.create_layer())
    }

    create_layer() {
        // Initialize source
        let source = new VectorSource({
            useSpatialIndex: !this.lazy || this.popup || this.hover,
        })

        // Layer definition
        const layer = new WebGLVectorLayer({
            source: source,
            style: this.get_style(),
            disableHitDetection: !(this.popup || this.hover),
        })
        layer.setOpacity(this.opacity)
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

        // Hover
        if (this.hover) {
            this.map.add_hover_event({ layer_id: layer.id, selected_feature: null })
        }

        // Popup
        if (this.popup) {
            this.map.add_popup_event({
                layer_id: layer.id,
                coordinates_fn: (feature) => feature.getGeometry().getCoordinates(),
                content_fn: this.get_popup_content_fn(),
            })
        }

        return layer
    }

    get_create_feature_fn() {
        const fill_fn = this.get_fill_fn()
        const radius_fn = this.get_radius_fn()
        return (d) =>
            new Feature({
                geometry: new Point([d["pylifemap_x"], d["pylifemap_y"]]),
                data: this.popup ? d : null,
                radius: radius_fn != null ? radius_fn(d[this.radius]) : null,
                fill: fill_fn != null ? fill_fn(d[this.fill]) : null,
            })
    }

    get_radius_fn() {
        if (!this.radius_is_column) {
            return null
        }
        const min_domain = d3.min(this.data, (d) => Number(d[this.radius]))
        const max_domain = d3.max(this.data, (d) => Number(d[this.radius]))
        const [min_range, max_range] = this.radius_range

        return (d) =>
            min_range +
            ((Number(d) - min_domain) / (max_domain - min_domain)) *
                (max_range - min_range)
    }

    get_fill_fn = function () {
        if (!this.fill_is_column) {
            return null
        }
        // Check if fill column is categorical
        let fill_cat = this.fill_cat ?? is_categorical_column(this.data, this.fill)
        return fill_cat ? this.get_categorical_fill_fn() : this.get_linear_fill_fn()
    }

    get_linear_fill_fn() {
        let min_value, max_value
        if (this.color_ranges[this.fill] !== undefined) {
            min_value = this.color_ranges[this.fill].min
            max_value = this.color_ranges[this.fill].max
        } else {
            max_value = d3.max(this.data, (d) => Number(d[this.fill]))
            min_value = d3.min(this.data, (d) => Number(d[this.fill]))
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

    get_categorical_fill_fn() {
        const scheme = this.scheme ?? DEFAULT_CAT_SCHEME
        let domain =
            this.categories ?? [...new Set(this.data.map((d) => d[this.fill]))].sort()
        domain = domain.map((d) => d.toString())
        const scale = {
            color: { type: "categorical", scheme: scheme, domain: domain },
            columns: 1,
            className: "lifemap-ol-cat-legend",
            label: this.label,
        }
        this.scales.push(scale)
        const plot_scale = Plot.scale(scale)
        return (d) => plot_scale.apply(d.toString())
    }

    get_style() {
        // Radius style
        const circle_radius = this.radius_is_column
            ? ["get", "radius"]
            : (this.radius ?? DEFAULT_RADIUS)

        // Fill style
        let circle_fill = this.fill_is_column
            ? ["get", "fill"]
            : (this.fill ?? DEFAULT_FILL)
        if (this.hover) {
            circle_fill = ["match", ["get", "hover"], 1, "#ff0000", circle_fill]
        }

        return {
            "circle-radius": circle_radius,
            "circle-fill-color": circle_fill,
        }
    }

    get_popup_content_fn() {
        return this.popup_col
            ? (feature) => feature.get("data")[this.popup_col]
            : async (feature) => {
                  const taxid = feature.get("data")["pylifemap_taxid"]
                  let content = await get_popup_title(taxid)

                  let table_content =
                      this.radius_is_column && this.radius != this.fill
                          ? `<tr><td class='right'><strong>${this.radius}:</strong></td><td>${feature.get("data")[this.radius]}</td></tr>`
                          : ""
                  table_content += this.fill_is_column
                      ? `<tr><td class='right'><strong>${this.label}:</strong></td><td>${feature.get("data")[this.fill]}</td></tr>`
                      : ""

                  if (table_content != "") {
                      content += `<table><tbody>${table_content}</tbody></table>`
                  }

                  return content
              }
    }
}

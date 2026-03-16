import {
    guidGenerator,
    is_categorical_column,
    DEFAULT_CAT_SCHEME,
    DEFAULT_NUM_SCHEME,
} from "../utils"
import { fromLonLat, toLonLat } from "ol/proj"
import * as turf from "@turf/turf"
import { get_arc_popup_title } from "../data/api"
import { GeoJSON } from "ol/format"
import Feature from "ol/Feature.js"
import WebGLVectorLayer from "ol/layer/WebGLVector.js"
import VectorLayer from "ol/layer/Vector"
import { Point } from "ol/geom"
import { Stroke } from "ol/style"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"
import VectorSource from "ol/source/Vector.js"
import { Style, RegularShape, Fill } from "ol/style"
import { is_data_column } from "../utils"

const DEFAULT_WIDTH = 3
const DEFAULT_COLOR = "#DD0000"
// Arcs are above labels
const BASE_ZINDEX = 6

export class ArcsLayer {
    constructor(id, map, data, options = {}, color_ranges = {}) {
        let {
            width = null,
            color = null,
            color_cat = null,
            categories = null,
            label = null,
            scheme = null,
            opacity = 0.8,
            linetype = "solid",
            arrow = false,
            arrow_width = 12,
            arrow_width_range = [6, 20],
            popup = false,
            popup_col = null,
            hover = false,
            lazy = false,
            lazy_zoom = 15,
            width_range = [2, 15],
        } = options

        Object.assign(this, {
            width,
            color,
            color_cat,
            categories,
            label,
            scheme,
            opacity,
            linetype,
            arrow,
            arrow_width,
            arrow_width_range,
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

        // Check if width is a fixed radius or a data column
        this.width_is_column = is_data_column(this.data, this.width)

        // Check if color is a fixed color or a data column
        this.color_is_column = is_data_column(this.data, this.color)

        this.layers.push(this.create_layer())
    }

    create_layer() {
        // Initialize source
        let arc_source = new VectorSource({
            useSpatialIndex: !this.lazy || this.popup || this.hover,
        })

        let style = this.arrow ? this.get_canvas_style() : this.get_webgl_style()
        const layer_type = this.arrow ? VectorLayer : WebGLVectorLayer
        const arc_layer = new layer_type({
            zIndex: BASE_ZINDEX,
            source: arc_source,
            style: style,
            disableHitDetection: !(this.popup || this.hover),
            opacity: this.opacity,
        })
        arc_layer.id = this.id

        // Features creation
        const create_feature_fn = this.get_create_feature_fn()
        if (this.lazy) {
            this.map.setup_lazy_loading({
                data: this.data,
                source: arc_source,
                create_feature_fn: create_feature_fn,
                lazy_zoom: this.lazy_zoom,
                type: "arcs",
            })
        } else {
            arc_source.addFeatures(this.data.map(create_feature_fn).flat())
        }

        // Hover
        if (this.hover) {
            this.map.add_hover_event({ layer_id: arc_layer.id, selected_feature: null })
        }

        // Popup
        if (this.popup) {
            this.map.add_popup_event({
                layer_id: arc_layer.id,
                content_fn: this.get_popup_content_fn(),
                offset: [0, -5],
            })
        }
        return arc_layer
    }

    get_create_feature_fn() {
        const width_fn = this.get_width_fn()
        const arrow_width_fn = this.get_arrow_width_fn()
        const color_fn = this.get_color_fn()
        return (d, i) => {
            const arc_geometry = compute_arc(
                toLonLat([d["pylifemap_x"], d["pylifemap_y"]]),
                toLonLat([d["pylifemap_dest_x"], d["pylifemap_dest_y"]])
            )
            const arc_feature = new Feature({
                geometry: arc_geometry.clone(),
                data: this.popup ? d : null,
                width: width_fn != null ? width_fn(d[this.width]) : null,
                color: color_fn != null ? color_fn(d[this.color]) : null,
                zindex: i,
            })
            let features = Array(arc_feature)
            if (this.arrow) {
                arc_geometry.applyTransform((coord) => {
                    return fromLonLat(coord, "EPSG:3857")
                })
                const coordinates = arc_geometry.getCoordinates()
                const last_coord = coordinates[coordinates.length - 1]
                const prev_coord = coordinates[coordinates.length - 2]

                // Calculate the angle of the line segment
                const angle = Math.atan2(
                    last_coord[1] - prev_coord[1],
                    last_coord[0] - prev_coord[0]
                )
                const radius =
                    arrow_width_fn != null ? arrow_width_fn(d[this.width]) : DEFAULT_WIDTH
                const arrow_feature = new Feature({
                    geometry: new Point(last_coord),
                    angle: Math.PI / 2 - angle,
                    radius: radius,
                    displacement_y: -radius,
                    color: color_fn != null ? color_fn(d[this.color]) : DEFAULT_COLOR,
                    zindex: i,
                })
                features = [arrow_feature, ...features]
            }
            return features
        }
    }

    get_arrow_width_fn() {
        if (!this.width_is_column) {
            return null
        }
        const min_domain = d3.min(this.data, (d) => Number(d[this.width]))
        const max_domain = d3.max(this.data, (d) => Number(d[this.width]))
        const [min_range, max_range] = this.arrow_width_range

        return (d) =>
            min_range +
            ((Number(d) - min_domain) / (max_domain - min_domain)) *
                (max_range - min_range)
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

    get_color_fn = function () {
        if (!this.color_is_column) {
            return null
        }
        // Check if color column is categorical
        let color_cat = this.color_cat ?? is_categorical_column(this.data, this.color)
        return color_cat ? this.get_categorical_color_fn() : this.get_linear_color_fn()
    }

    get_linear_color_fn() {
        let min_value, max_value
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

    get_categorical_color_fn() {
        const scheme = this.scheme ?? DEFAULT_CAT_SCHEME
        let domain =
            this.categories ?? [...new Set(this.data.map((d) => d[this.color]))].sort()
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

    get_canvas_style() {
        return (feature) => {
            const stroke_width = this.width_is_column
                ? feature.get("width")
                : (this.width ?? DEFAULT_WIDTH)

            // Color style
            let stroke_color = this.color_is_column
                ? feature.get("color")
                : (this.color ?? DEFAULT_COLOR)
            if (this.hover) {
                stroke_color = feature.get("hover") == 1 ? "#ff0000" : stroke_color
            }

            const arc_style = new Style({
                stroke: new Stroke({
                    color: stroke_color,
                    width: stroke_width,
                    lineCap: "butt",
                    lineJoin: "bevel",
                    lineDash: this.get_line_dash(),
                    lineDashOffset: 0,
                }),
                zIndex: feature.get("zindex"),
            })
            const styles = [arc_style]
            if (this.arrow) {
                const radius = feature.get("radius") ?? this.arrow_width
                const rotation = feature.get("angle")
                const arrow_style = new Style({
                    image: new RegularShape({
                        fill: new Fill({
                            color: feature.get("color") ?? "#DD0000",
                        }),
                        points: 3,
                        radius: radius,
                        angle: 0,
                        rotation: rotation,
                        // Displacement to put arrow head at last coordinate
                        displacement: [0, -radius],
                    }),
                    zIndex: feature.get("zindex"),
                })
                styles.push(arrow_style)
            }
            return styles
        }
    }

    get_webgl_style() {
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

        return {
            "stroke-width": stroke_width,
            "stroke-color": stroke_color,
            "stroke-line-dash": this.get_line_dash(),
            "stroke-line-dash-offset": 0,
            "stroke-line-cap": "butt",
            "stroke-line-join": "bevel",
        }
    }

    get_line_dash() {
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
        return stroke_line_dash
    }

    get_popup_content_fn() {
        return this.popup_col
            ? (feature) => feature.get("data")[this.popup_col]
            : async (feature) => {
                  const source_taxid = feature.get("data")["pylifemap_taxid"]
                  const dest_taxid = feature.get("data")["pylifemap_dest_taxid"]
                  let content = await get_arc_popup_title(source_taxid, dest_taxid)

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

function compute_arc(p1LonLat, p2LonLat) {
    const source_point = turf.point(p1LonLat)
    const dest_point = turf.point(p2LonLat)
    const d = turf.distance(source_point, dest_point)
    const pMid = turf.midpoint(source_point, dest_point)

    const lineBearing = turf.bearing(source_point, dest_point)
    const center_point = turf.destination(pMid, 0.15 * d, lineBearing - 90)
    const line = turf.lineString([
        source_point.geometry.coordinates,
        center_point.geometry.coordinates,
        dest_point.geometry.coordinates,
    ])

    const arc = turf.bezierSpline(line, { resolution: 2000, sharpness: 1.1 })

    const arc_feature = new GeoJSON().readFeatures(arc, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
    })

    return arc_feature[0].getGeometry()
}

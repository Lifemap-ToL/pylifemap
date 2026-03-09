import { guidGenerator, DEFAULT_CAT_SCHEME } from "../utils"
import { get_popup_title } from "../data/api"

import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import Point from "ol/geom/Point.js"
import Feature from "ol/Feature.js"
import Icon from "ol/style/Icon.js"
import Style from "ol/style/Style.js"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"

export class DonutsLayer {
    constructor(id, map, layer_data, options = {}) {
        let {
            counts_col,
            show_totals = false,
            categories = null,
            scheme = undefined,
            label = undefined,
            radius = 50,
            opacity = 0.9,
            popup = true,
            popup_col = null,
            declutter = true,
            lazy = true,
            lazy_zoom = 4,
        } = options

        Object.assign(this, {
            counts_col,
            show_totals,
            categories,
            scheme,
            label,
            radius,
            opacity,
            popup,
            popup_col,
            declutter,
            lazy,
            lazy_zoom,
        })

        this.id = `lifemap-ol-${id ?? guidGenerator()}`
        this.map = map
        this.data = layer_data.map((d) => {
            return {
                ...d,
                [counts_col]: Object.entries(d[counts_col]).map(([key, value]) => ({
                    key,
                    value,
                })),
            }
        })
        this.label = this.label ?? this.counts_col

        this.is_webgl = false
        this.type = "ol"

        this.scales = []
        this.layers = []

        this.radius_fn = this.get_radius_fn()
        this.color_domain = this.get_color_domain()
        this.color_fn = this.get_color_fn()
        this.color_domain_ranks = Object.fromEntries(
            this.color_domain.map((item, index) => [item, index])
        )

        this.layers.push(this.create_layer())
    }

    create_layer() {
        // Initialize source
        let source = new VectorSource({
            useSpatialIndex: !this.lazy || this.popup || this.hover,
        })

        // Layer definition
        const layer = new VectorLayer({
            declutter: this.declutter ? this.id : false,
            // Donuts are above labels
            zIndex: 6,
            source: source,
            style: this.get_style_fn(),
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

        // Popup
        if (this.popup) {
            this.map.add_popup_event({
                layer_id: layer.id,
                coordinates_fn: (feature) => feature.getGeometry().getCoordinates(),
                content_fn: this.get_popup_content_fn(),
                offset: [
                    0,
                    Array.isArray(this.radius) ? -this.radius[0] / 2 : -this.radius / 2,
                ],
            })
        }

        return layer
    }

    get_create_feature_fn() {
        return (d) =>
            new Feature({
                geometry: new Point([d["pylifemap_x"], d["pylifemap_y"]]),
                data: d,
            })
    }

    get_color_domain() {
        return (
            this.categories ?? this.data[0][this.counts_col].map((d) => d["key"]).sort()
        )
    }

    get_color_fn() {
        const scheme = this.scheme ?? DEFAULT_CAT_SCHEME
        const scale = {
            // Get levels
            color: {
                type: "categorical",
                scheme: scheme,
                domain: this.get_color_domain(),
            },
            columns: 1,
            className: "lifemap-ol-cat-legend",
            label: this.label,
        }
        this.scales.push(scale)
        const plot_scale = Plot.scale(scale)
        return (key) => plot_scale.apply(key)
    }

    get_radius_fn() {
        if (!Array.isArray(this.radius)) {
            return () => this.radius
        }
        const min_domain = d3.min(this.data, (d) => Number(d["pylifemap_total"]))
        const max_domain = d3.max(this.data, (d) => Number(d["pylifemap_total"]))
        const [min_range, max_range] = this.radius

        return (d) =>
            Math.round(
                min_range +
                    ((Number(d) - min_domain) / (max_domain - min_domain)) *
                        (max_range - min_range)
            )
    }

    get_style_fn() {
        return (feature) => {
            const data = feature.get("data")
            const counts = data[this.counts_col]
            const total = data["pylifemap_total"]
            const size = this.radius_fn(total)

            // Create chart
            const chart = this.donut_chart(counts, total, size)

            // Encode to base64 svg icon
            const src = "data:image/svg+xml;base64," + window.btoa(chart.outerHTML)

            const style = {
                image: new Icon({
                    src: src,
                    opacity: 1,
                    width: size,
                    height: size,
                }),
            }

            return new Style(style)
        }
    }

    get_popup_content_fn() {
        return this.popup_col
            ? (feature) => feature.get("data")[this.popup_col]
            : async (feature) => {
                  const taxid = feature.get("data")["pylifemap_taxid"]
                  let content = await get_popup_title(taxid)

                  const data = feature.get("data")[this.counts_col]
                  const total = data
                      .map((d) => d.value)
                      .reduce((acc, val) => acc + val, 0)

                  data.sort((a, b) =>
                      this.color_domain.indexOf(a.key) > this.color_domain.indexOf(b.key)
                          ? 1
                          : -1
                  )

                  let table_content = ""
                  for (let d of data) {
                      table_content += `<tr><td><svg width="15" height="15" fill="${this.color_fn(
                          d.key
                      )}"><rect width="100%" height="100%"></rect></svg></td><td>${
                          d.key
                      }</td><td class="right">${d.value}</td><td class="right">(${(
                          (d.value / total) *
                          100
                      ).toFixed(1)}%)</td></tr>`
                  }

                  if (table_content != "") {
                      content += `<table><tbody>${table_content}</tbody></table>`
                  }
                  return content
              }
    }

    donut_chart(counts, total, size) {
        const width = size
        const height = size
        const outerRadius = Math.min(width, height) / 2 - 1
        const innerRadius = Math.max(8, outerRadius - 12)

        const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius)

        let svg = d3
            .create("svg:svg")
            .attr("version", "1.1")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [-width / 2, -height / 2, width, height])

        let pie = d3
            .pie()
            .sort((a, b) =>
                d3.ascending(
                    this.color_domain_ranks[a.key],
                    this.color_domain_ranks[b.key]
                )
            )
            .value((d) => d["value"])
        let arcs = pie(counts)

        svg.append("g")
            .attr("stroke", "white")
            .selectAll()
            .data(arcs)
            .join("path")
            .attr("d", arc)
            .attr("fill", (d) => this.color_fn(d.data.key))
            .attr("stroke", "white")
            .style("stroke-width", "0px")
            .style("opacity", this.opacity)

        if (this.show_totals) {
            const total_format_fn = (d) => (d >= 1000 ? d3.format(".2~s")(d) : d)
            svg.append("circle")
                .attr("r", innerRadius)
                .style("fill", "rgba(0, 0, 0, 0.7)")
            svg.append("text")
                .attr("fill", "white")
                .attr("stroke", "black")
                .attr("dy", 5)
                .attr("text-anchor", "middle")
                .style("stroke-width", "0.2px")
                .style("font-weight", "bold")
                .style("font-size", "16px")
                .style("font-family", "sans-serif")
                .text(total_format_fn(total))
        }

        return svg.node()
    }
}

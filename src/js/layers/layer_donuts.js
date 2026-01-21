import { guidGenerator, DEFAULT_CAT_SCHEME } from "../utils"
import { get_popup_title } from "../data/api"
import { set_popup_event } from "../elements/popup"
import { setup_lazy_loading } from "../data/lazy_loading"

import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import Point from "ol/geom/Point.js"
import Feature from "ol/Feature.js"
import Icon from "ol/style/Icon.js"
import Style from "ol/style/Style.js"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"

export function layer_donuts(map, data, options = {}) {
    let {
        id = undefined,
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

    // Layer id
    id = `lifemap-ol-${id ?? guidGenerator()}`

    // Convert to array of {key: , value: } objects
    data.forEach((d) => {
        d[counts_col] = Object.entries(JSON.parse(d[counts_col])).map((d) => ({
            key: d[0],
            value: d[1],
        }))
    })

    label = label ?? counts_col

    // Color scale
    scheme = scheme ?? DEFAULT_CAT_SCHEME
    let scales = []
    const domain = categories ?? data[0][counts_col].map((d) => d["key"]).sort()
    let scale = {
        // Get levels
        color: { type: "categorical", scheme: scheme, domain: domain },
        columns: 1,
        className: "lifemap-ol-cat-legend",
        label: label,
    }
    scales.push(scale)
    let scale_fn = (key) => Plot.scale(scale).apply(key)

    // Radius function
    let get_radius_col_fn = function (data) {
        const min_domain = d3.min(data, (d) => Number(d["pylifemap_total"]))
        const max_domain = d3.max(data, (d) => Number(d["pylifemap_total"]))
        const [min_range, max_range] = radius

        const fn = (d) => {
            return Math.round(
                min_range +
                    ((Number(d) - min_domain) / (max_domain - min_domain)) *
                        (max_range - min_range)
            )
        }
        return fn
    }
    const radius_col_fn = Array.isArray(radius) ? get_radius_col_fn(data) : () => radius

    // Style function
    function donut_style(feature) {
        const data = feature.get("data")
        const counts = data[counts_col]
        const total = data["pylifemap_total"]
        const size = radius_col_fn(total)

        // Create chart
        const chart = donut_chart(counts, total, size, scale_fn, opacity, show_totals)

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

    // Create feature
    function create_feature(d) {
        return new Feature({
            geometry: new Point([d["pylifemap_x"], d["pylifemap_y"]]),
            data: d,
        })
    }

    // Donuts layer
    const source = new VectorSource({ useSpatialIndex: !lazy || popup || hover })
    if (!lazy) {
        const features = data.map(create_feature)
        source.addFeatures(features)
    }
    const layer = new VectorLayer({
        declutter: declutter ? id : false,
        // Donuts are above labels
        zIndex: 6,
        source: source,
        style: donut_style,
    })

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

    // Popup
    if (popup) {
        const content_fn = popup_col
            ? (feature) => feature.get("data")[popup_col]
            : async (feature) => {
                  const taxid = feature.get("data")["pylifemap_taxid"]
                  let content = await get_popup_title(taxid)

                  const data = feature.get("data")[counts_col]
                  const total = data
                      .map((d) => d.value)
                      .reduce((acc, val) => acc + val, 0)

                  data.sort((a, b) =>
                      domain.indexOf(a.key) > domain.indexOf(b.key) ? 1 : -1
                  )

                  let table_content = ""
                  for (let d of data) {
                      table_content += `<tr><td><svg width="15" height="15" fill="${scale_fn(
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
        const coordinates_fn = (feature) => [
            feature.get("data").pylifemap_x,
            feature.get("data").pylifemap_y,
        ]
        const offset = [0, Array.isArray(radius) ? -radius[0] / 2 : -radius / 2]
        set_popup_event(map, id, coordinates_fn, content_fn, offset)
    }

    layer.lifemap_ol_id = id
    layer.lifemap_ol_scales = scales

    return layer
}

function donut_chart(counts, total, size, color_scale_fn, opacity, show_totals) {
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
        .sort(null)
        .value(function (d) {
            return d["value"]
        })
    let arcs = pie(counts)

    svg.append("g")
        .attr("stroke", "white")
        .selectAll()
        .data(arcs)
        .join("path")
        .attr("d", arc)
        .attr("fill", (d) => color_scale_fn(d.data.key))
        .attr("stroke", "white")
        .style("stroke-width", "0px")
        .style("opacity", opacity)

    if (show_totals) {
        const total_format_fn = (d) => (d >= 1000 ? d3.format(".2~s")(d) : d)
        svg.append("circle").attr("r", innerRadius).style("fill", "rgba(0, 0, 0, 0.7)")
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

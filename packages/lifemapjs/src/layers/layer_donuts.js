import { guidGenerator, DEFAULT_CAT_SCHEME } from "../utils"
import { get_popup_title } from "../api"
import { set_popup_event } from "../elements/popup"

import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import Point from "ol/geom/Point.js"
import Feature from "ol/Feature.js"
import Icon from "ol/style/Icon.js"
import Style from "ol/style/Style.js"
import { getBottomLeft, getTopRight } from "ol/extent.js"
import { fromLonLat, toLonLat } from "ol/proj"

import * as d3 from "d3"
import * as Plot from "@observablehq/plot"

export function layer_donuts(map, data, options = {}) {
    let {
        id = undefined,
        x_col = "pylifemap_x",
        y_col = "pylifemap_y",
        counts_col,
        scheme = undefined,
        label = undefined,
        radius = 50,
        opacity = 0.9,
    } = options

    // Layer id
    id = `lifemap-ol-${id ?? guidGenerator()}`

    // Get levels
    const levels = Object.keys(JSON.parse(data[0][counts_col])).sort()
    // Convert to array of {key: , value: } objects
    data.forEach((d) => {
        d[counts_col] = Object.entries(JSON.parse(d[counts_col])).map((d) => ({
            key: d[0],
            value: d[1],
        }))
    })

    label = label ?? counts_col
    radius = radius ?? 50

    // Color scale
    scheme = scheme ?? DEFAULT_CAT_SCHEME
    let scales = []
    let scale = {
        color: { type: "categorical", scheme: scheme, domain: levels },
        columns: 1,
        className: "lifemap-ol-cat-legend",
        label: label,
    }
    scales.push(scale)
    let scale_fn = (key) => Plot.scale(scale).apply(key)

    // Create feature from data
    function create_donut_feature(d) {
        const coordinates = fromLonLat([d[x_col], d[y_col]])
        return new Feature({ geometry: new Point(coordinates), data: d })
    }

    // Style function
    function donut_style(feature) {
        const data = feature.get("data")
        const counts = data[counts_col]
        const chart = donut_chart(counts, radius, scale_fn, opacity)
        const src = "data:image/svg+xml;base64," + window.btoa(chart.outerHTML)

        const style = {
            image: new Icon({
                src: src,
                opacity: 1,
                width: radius,
                height: radius,
            }),
        }

        return new Style(style)
    }

    // Donuts layer
    const donuts_source = new VectorSource({})
    const layer = new VectorLayer({
        declutter: id,
        // Donuts are above labels
        zIndex: 6,
        source: donuts_source,
        style: donut_style,
    })

    // Refresh features after move or zoom
    function on_move_end(ev) {
        const map = ev.map
        const zoom = map.getView().getZoom()
        let extent = map.getView().calculateExtent()
        extent = [...toLonLat(getBottomLeft(extent)), ...toLonLat(getTopRight(extent))]

        const extent_data = data.filter((d) => d["pylifemap_zoom"] <= zoom + 3)
        const extent_features = extent_data.map(create_donut_feature)

        donuts_source.clear()
        donuts_source.addFeatures(extent_features)

        map.render()
    }

    map.on("moveend", on_move_end)

    /* Popup  */

    const content_fn = async (feature) => {
        const taxid = feature.get("data")["taxid"]
        let content = await get_popup_title(taxid)

        const data = feature.get("data")[counts_col]
        const total = data.map((d) => d.value).reduce((acc, val) => acc + val, 0)
        data.sort((a, b) => (a.key > b.key ? 1 : -1))

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
    const offset = [0, -radius / 2]
    set_popup_event(map, id, coordinates_fn, content_fn, offset)

    layer.lifemap_ol_id = id
    layer.lifemap_ol_scales = scales

    return layer
}

function donut_chart(counts, size, color_scale_fn, opacity) {
    const width = size
    const height = size

    const arc = d3
        .arc()
        .innerRadius(10)
        .outerRadius(Math.min(width, height) / 2 - 1)

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
            return d.value
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

    return svg.node()
}

import { getBottomLeft, getTopRight } from "ol/extent.js"
import { fromLonLat, toLonLat } from "ol/proj.js"

// Points filtering function
const points_filter_fn = (d, xmin, xmax, ymin, ymax) =>
    d["pylifemap_x"] >= xmin - Math.abs(xmin) * 0.1 &&
    d["pylifemap_x"] <= xmax + Math.abs(xmax) * 0.1 &&
    d["pylifemap_y"] >= ymin - Math.abs(ymin) * 0.1 &&
    d["pylifemap_y"] <= ymax + Math.abs(ymax) * 0.1

// Lines filtering function
const lines_filter_fn = (d, xmin, xmax, ymin, ymax) =>
    (d["pylifemap_x0"] >= xmin - Math.abs(xmin) * 0.1 &&
        d["pylifemap_x0"] <= xmax + Math.abs(xmax) * 0.1 &&
        d["pylifemap_y0"] >= ymin - Math.abs(ymin) * 0.1 &&
        d["pylifemap_y0"] <= ymax + Math.abs(ymax) * 0.1) ||
    (d["pylifemap_x1"] >= xmin - Math.abs(xmin) * 0.1 &&
        d["pylifemap_x1"] <= xmax + Math.abs(xmax) * 0.1 &&
        d["pylifemap_y1"] >= ymin - Math.abs(ymin) * 0.1 &&
        d["pylifemap_y1"] <= ymax + Math.abs(ymax) * 0.1)

export function setup_lazy_loading(options) {
    let { map, data, source, create_feature_fn, lazy_zoom, type } = options
    const filter_fn = type == "points" ? points_filter_fn : lines_filter_fn

    function display_for_extent(map) {
        const zoom = map.getView().getZoom()
        let extent = map.getView().calculateExtent()
        let [xmin, ymin, xmax, ymax] = [
            ...toLonLat(getBottomLeft(extent)),
            ...toLonLat(getTopRight(extent)),
        ]
        let extent_data = data
            .filter((d) => filter_fn(d, xmin, xmax, ymin, ymax))
            .filter((d) => d["pylifemap_zoom"] <= zoom + lazy_zoom)
        const extent_features = extent_data.map(create_feature_fn)

        source.clear()
        source.addFeatures(extent_features)

        map.render()
    }

    display_for_extent(map)

    // Refresh features after move or zoom
    function on_move_end(ev) {
        const map = ev.map
        display_for_extent(map)
    }

    map.on("moveend", on_move_end)
}

import { getBottomLeft, getTopRight } from "ol/extent.js"
import { toLonLat } from "ol/proj.js"

// Points filtering function
const points_filter_fn = (d, xmin, xmax, ymin, ymax) =>
    d["pylifemap_x"] >= xmin &&
    d["pylifemap_x"] <= xmax &&
    d["pylifemap_y"] >= ymin &&
    d["pylifemap_y"] <= ymax
// Lines filtering function
const lines_filter_fn = (d, xmin, xmax, ymin, ymax) =>
    (d["pylifemap_x0"] >= xmin &&
        d["pylifemap_x0"] <= xmax &&
        d["pylifemap_y0"] >= ymin &&
        d["pylifemap_y0"] <= ymax) ||
    (d["pylifemap_x1"] >= xmin &&
        d["pylifemap_x1"] <= xmax &&
        d["pylifemap_y1"] >= ymin &&
        d["pylifemap_y1"] <= ymax)

export function setup_lazy_loading(options) {
    let { map, data, source, create_feature_fn, lazy_zoom, type } = options
    const filter_fn = type == "points" ? points_filter_fn : lines_filter_fn

    function display_for_extent(map) {
        const zoom = map.getView().getZoom()
        let extent = map.getView().calculateExtent()
        let extent_data = data
        if (lazy_zoom > 0) {
            extent_data = extent_data.filter(
                (d) => d["pylifemap_zoom"] <= zoom + lazy_zoom
            )
        }
        let [xmin, ymin, xmax, ymax] = [
            ...toLonLat(getBottomLeft(extent)),
            ...toLonLat(getTopRight(extent)),
        ]
        xmin = xmin - Math.abs(xmin) * 0.1
        ymin = ymin - Math.abs(ymin) * 0.1
        xmax = xmax + Math.abs(xmax) * 0.1
        ymax = ymax + Math.abs(ymax) * 0.1
        extent_data = extent_data.filter((d) => filter_fn(d, xmin, xmax, ymin, ymax))
        const extent_features = extent_data.map(create_feature_fn)

        source.clear()
        source.addFeatures(extent_features)

        map.render()
    }

    display_for_extent(map)

    // Refresh features after move or zoom
    function on_move_end(ev) {
        display_for_extent(ev.map)
    }

    map.on("moveend", on_move_end)
}

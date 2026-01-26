import { getBottomLeft, getTopRight } from "ol/extent.js"

// Points filtering function
const points_filter_fn = (d, xmin, xmax, ymin, ymax, zoom) =>
    d["pylifemap_zoom"] <= zoom &&
    d["pylifemap_x"] >= xmin &&
    d["pylifemap_x"] <= xmax &&
    d["pylifemap_y"] >= ymin &&
    d["pylifemap_y"] <= ymax
// Lines filtering function
const lines_filter_fn = (d, xmin, xmax, ymin, ymax, zoom) =>
    d["pylifemap_zoom"] <= zoom &&
    ((d["pylifemap_x0"] >= xmin &&
        d["pylifemap_x0"] <= xmax &&
        d["pylifemap_y0"] >= ymin &&
        d["pylifemap_y0"] <= ymax) ||
        (d["pylifemap_x1"] >= xmin &&
            d["pylifemap_x1"] <= xmax &&
            d["pylifemap_y1"] >= ymin &&
            d["pylifemap_y1"] <= ymax))

export function setup_lazy_loading(options) {
    let { map, data, source, create_feature_fn, lazy_zoom, type } = options
    const filter_fn = type == "points" ? points_filter_fn : lines_filter_fn

    function display_for_extent(map) {
        const current_zoom = map.getView().getZoom()
        let extent = map.getView().calculateExtent()
        let [xmin, ymin, xmax, ymax] = [...getBottomLeft(extent), ...getTopRight(extent)]
        const xrange = xmax - xmin
        const yrange = ymax - ymin
        xmin = xmin - xrange * 0.05
        ymin = ymin - yrange * 0.05
        xmax = xmax + xrange * 0.05
        ymax = ymax + yrange * 0.05
        const zoom = lazy_zoom > 0 ? current_zoom + lazy_zoom : Infinity
        const extent_features = data
            .filter((d) => filter_fn(d, xmin, xmax, ymin, ymax, zoom))
            .map(create_feature_fn)

        source.clear()
        source.addFeatures(extent_features)

        map.render()
    }

    display_for_extent(map)

    // Refresh features after move or zoom
    function on_move_end(ev) {
        const map = ev.map
        map.lazy_spinner.show()
        requestAnimationFrame(() => {
            try {
                display_for_extent(map)
            } finally {
                map.lazy_spinner.hide()
            }
        })
    }

    map.on("moveend", on_move_end)
}

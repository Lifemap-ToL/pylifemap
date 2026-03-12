import { boundingExtent } from "ol/extent"
import { inAndOut } from "ol/easing"

// Lifemap backend URL
export const LIFEMAP_BACK_URL = "https://lifemap-back.univ-lyon1.fr"
export const MAX_SOLR_QUERY = 100_000

export const DARK_THEMES = ["dark"]
export const LANG = "en"

// Map defaults
export const DEFAULT_LON = 0
export const DEFAULT_LAT = -4.226497
export const DEFAULT_ZOOM = 5
export const LUCA_LON = 0
export const LUCA_LAT = -4.226497
export const LUCA_ZOOM = 5
export const MAP_EXTENT = [-74.203515625, -33.7091796875, 68.003515625, 35.1091796875]

// Default color schemes
export const DEFAULT_NUM_SCHEME = "viridis"
export const DEFAULT_CAT_SCHEME = "observable10"

// Create random string id
export function guidGenerator() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}

// JSON.stringify with BigInt objects handling for scales
export function stringify_scale(scale) {
    return JSON.stringify(scale, (_, v) => (typeof v === "bigint" ? v.toString() : v))
}

// Check if column is the name of a column of data
export function is_data_column(data, column) {
    return typeof column === "string" && Object.keys(data[0]).includes(column)
}

// Check if a data column can be considered categorical
// Any column which is not numerical or is numerical with fewer
// than 10 different values is considered categorical
export function is_categorical_column(data, column) {
    return !(
        ["number", "bigint"].includes(typeof data[0][column]) &
        ([...new Set(data.map((d) => d[column]))].length > 10)
    )
}

// Animated dezoom / zoom movement helper
// Taken from https://openlayers.org/en/latest/examples/animation.html
export function flyTo(view, center, dest_zoom, duration = 1000) {
    const current_zoom = view.getZoom()
    const current_center = view.getCenter()
    // Get bounding box of current and destination centers
    const extent = boundingExtent([current_center, center])
    // Get resolution and zoom for this bounding box
    const intermediate_resolution = view.getResolutionForExtent(extent)
    let intermediate_zoom = Math.round(view.getZoomForResolution(intermediate_resolution))
    // Intermediate zoom must be lower than current and dest
    intermediate_zoom = Math.min(intermediate_zoom, current_zoom, dest_zoom)

    // Zoom movements
    const start_zoom_move = Math.abs(intermediate_zoom - current_zoom)
    const end_zoom_move = Math.abs(intermediate_zoom - dest_zoom)
    const total_zoom_move = start_zoom_move + end_zoom_move

    // Take zoom movement into account in duration
    const total_duration = duration + 50 * total_zoom_move
    view.animate({
        center: center,
        duration: total_duration,
        easing: inAndOut,
    })
    view.animate(
        {
            zoom: intermediate_zoom,
            duration: total_duration * (start_zoom_move / total_zoom_move),
            easing: inAndOut,
        },
        {
            zoom: dest_zoom,
            duration: total_duration * (end_zoom_move / total_zoom_move),
            easing: inAndOut,
        }
    )
}

// Simple string hash function
// Source: https://stackoverflow.com/a/7616484
export function generate_hash(string) {
    let hash = 0
    for (const char of string) {
        hash = (hash << 5) - hash + char.charCodeAt(0)
        hash |= 0
    }
    return hash
}

import {
    tableFromIPC,
    compressionRegistry,
    CompressionType,
} from "@apache-arrow/es2015-esm"
import * as lz4 from "lz4js"
import { easeIn, easeOut, linear } from "ol/easing"
import { boundingExtent } from "ol/extent"

// Lifemap backend URL
export const LIFEMAP_BACK_URL = "https://lifemap-back.univ-lyon1.fr"

// Map defaults
export const DEFAULT_LON = 0
export const DEFAULT_LAT = -4.226497
export const MAP_EXTENT = [-74.203515625, -33.7091796875, 68.003515625, 35.1091796875]

// Default color schemes
export const DEFAULT_NUM_SCHEME = "viridis"
export const DEFAULT_CAT_SCHEME = "observable10"

// Arrow IPC lz4 compression
const lz4Codec = {
    encode(data) {
        return lz4.compress(data)
    },
    decode(data) {
        return lz4.decompress(data)
    },
}
compressionRegistry.set(CompressionType.LZ4_FRAME, lz4Codec)

// Unserialize data from Arrow IPC to JS Array
export function unserialize_data(data) {
    if (data["serialized"]) {
        let value = data["value"]
        let table = tableFromIPC(value)
        table = table.toArray()
        // Find timestamp column names
        //const date_columns = table.schema.fields
        //    .filter((d) => d.type.toString().startsWith("Timestamp"))
        //    .map((d) => d.name);
        // Convert to JS array (it is done by Plot afterward anyway)
        // Convert timestamp columns to Date
        //table = table.map((d) => {
        //    for (let col of date_columns) {
        //        d[col] = new Date(d[col]);
        //    }
        //   return d;
        //});
        return table
    } else {
        return data["value"]
    }
}

// Create random string id
export function guidGenerator() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}

// JSON.stringify with BigInt objects handling for scales
export function stringify_scale(scale) {
    return JSON.stringify(scale, (_, v) => (typeof v === "bigint" ? v.toString() : v))
}

// Add hover event to layer
export function set_hover_event(map, id, selected_feature) {
    map.on("pointermove", function (ev) {
        if (selected_feature !== null) {
            selected_feature.set("hover", 0)
            selected_feature = null
        }

        map.forEachFeatureAtPixel(
            ev.pixel,
            function (feature) {
                feature.set("hover", 1)
                selected_feature = feature
                return true
            },
            { layerFilter: (d) => d.lifemap_ol_id == id }
        )
    })
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
    })
    view.animate(
        {
            zoom: intermediate_zoom,
            duration: total_duration * (start_zoom_move / total_zoom_move),
        },
        {
            zoom: dest_zoom,
            duration: total_duration * (end_zoom_move / total_zoom_move),
        }
    )
}

import { tableFromIPC } from "@apache-arrow/es2015-esm"

// Lifemap backend URL
export const LIFEMAP_BACK_URL = "https://lifemap-temp.lhst.eu"

export const DEFAULT_LON = 0
export const DEFAULT_LAT = -4.226497
export const MAP_EXTENT = [-74.203515625, -33.7091796875, 68.003515625, 35.1091796875]

// Default color schemes
export const DEFAULT_NUM_SCHEME = "viridis"
export const DEFAULT_CAT_SCHEME = "observable10"

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

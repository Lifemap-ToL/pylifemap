import { tableFromIPC } from "@apache-arrow/es2015-esm";

// Default color schemes
export const DEFAULT_NUM_SCHEME = "viridis";
export const DEFAULT_CAT_SCHEME = "observable10";

// Unserialize data from Arrow IPC to JS Array
export function unserialize_data(data) {
    if (data["serialized"]) {
        let value = data["value"];
        let table = tableFromIPC(value);
        table = table.toArray();
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
        return table;
    } else {
        return data["value"];
    }
}

// Create random string id
export function guidGenerator() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// JSON.stringify with BigInt objects handling for scales
export function stringify_scale(scale) {
    return JSON.stringify(scale, (_, v) => (typeof v === "bigint" ? v.toString() : v));
}

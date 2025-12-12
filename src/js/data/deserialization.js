import {
    tableFromIPC,
    compressionRegistry,
    CompressionType,
} from "@apache-arrow/es2015-esm"
import * as lz4 from "lz4js"

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
export function deserialize_data(data) {
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

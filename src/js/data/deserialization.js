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
        return tableFromIPC(data["value"]).toArray()
    } else {
        return data["value"]
    }
}

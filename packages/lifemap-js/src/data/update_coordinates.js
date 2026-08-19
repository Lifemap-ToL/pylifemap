import { MAX_SOLR_QUERY } from "../utils"
import { get_data_coords } from "./api"

// Update coordinates of a data array from the Lifemap API
export async function update_coordinates(data) {
    let taxids = new Set()
    for (let k in data) {
        taxids = taxids.union(
            new Set(
                data[k]
                    .map((d) =>
                        // If lines data, add parent
                        d.pylifemap_parent != null
                            ? [d.pylifemap_taxid, d.pylifemap_parent]
                            : // If arcs data, add dest
                              d.pylifemap_dest_taxid != null
                              ? [d.pylifemap_taxid, d.pylifemap_dest_taxid]
                              : d.pylifemap_taxid
                    )
                    .flat()
            )
        )
    }
    if (taxids.size > MAX_SOLR_QUERY) {
        console.log("Too many taxids to query for up-to-date coordinates.")
    }
    if (taxids.size > 0 && taxids.size <= MAX_SOLR_QUERY) {
        // Get up-to-date coordinates from lifemap-back solr
        let coords = await get_data_coords(taxids)
        // If query succeeded, update coordinates with new values
        if (coords !== null) {
            for (let k in data) {
                // Filter out data points whose taxid is not in the lifemap database anymore
                data[k] = data[k].filter((d) => {
                    const taxid_coords = coords[d.pylifemap_taxid]
                    if (taxid_coords == null) {
                        console.warn(
                            `${d.pylifemap_taxid} not found in updated coords - removed`
                        )
                        return false
                    }
                    // Lines data
                    if (d.pylifemap_parent_taxid != null) {
                        const taxid_parent_coords = coords[d.pylifemap_parent_taxid]
                        if (taxid_parent_coords == null) {
                            console.warn(
                                `${d.pylifemap_parent_taxid} not found in updated parent coords - removed`
                            )
                            return false
                        }
                    }
                    if (d.pylifemap_dest_taxid != null) {
                        const taxid_dest_coords = coords[d.pylifemap_dest_taxid]
                        if (taxid_dest_coords == null) {
                            console.warn(
                                `${d.pylifemap_dest_taxid} not found in updated dest coords - removed`
                            )
                            // Filter out data point
                            return false
                        }
                    }
                    return true
                })
                // Update coordinates for still existing taxids
                data[k].forEach((d) => {
                    const taxid_coords = coords[d.pylifemap_taxid]
                    if (d.pylifemap_zoom != null) {
                        d.pylifemap_zoom = taxid_coords.zoom
                    }
                    if (d.pylifemap_x != null) {
                        d.pylifemap_x = taxid_coords.x
                        d.pylifemap_y = taxid_coords.y
                    }

                    // Lines data
                    if (d.pylifemap_parent_taxid != null) {
                        const taxid_parent_coords = coords[d.pylifemap_parent_taxid]
                        d.pylifemap_parent_x = taxid_parent_coords.x
                        d.pylifemap_parent_y = taxid_parent_coords.y
                    }

                    // Arcs data
                    if (d.pylifemap_dest_taxid != null) {
                        const taxid_dest_coords = coords[d.pylifemap_dest_taxid]
                        d.pylifemap_dest_x = taxid_dest_coords.x
                        d.pylifemap_dest_y = taxid_dest_coords.y
                    }
                })
            }
        }
    }
}

import { MAX_SOLR_QUERY } from "../utils"
import { get_data_coords } from "./api"

// Update coordinates of a data array from the Lifemap API
export async function update_coordinates(data) {
    let taxids = new Set()
    for (let k in data) {
        let current_data = data[k]
        taxids = taxids.union(
            new Set(
                current_data
                    .map((d) =>
                        // If lines data, add parent
                        d.pylifemap_parent !== undefined
                            ? [d.pylifemap_taxid, d.pylifemap_parent]
                            : // If arcs data, add dest
                              d.pylifemap_dest_taxid !== undefined
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
                data[k].forEach((d) => {
                    const taxid_coords = coords[d.pylifemap_taxid]
                    if (d.pylifemap_zoom !== undefined) {
                        d.pylifemap_zoom = taxid_coords.zoom
                    }
                    if (taxid_coords !== undefined) {
                        if (d.pylifemap_x !== undefined) {
                            d.pylifemap_x = taxid_coords.x
                            d.pylifemap_y = taxid_coords.y
                        }
                    }
                    // Lines data
                    if (d.pylifemap_parent_taxid !== undefined) {
                        const taxid_parent_coords = coords[d.pylifemap_parent_taxid]
                        if (taxid_parent_coords !== undefined) {
                            d.pylifemap_parent_x = taxid_parent_coords.x
                            d.pylifemap_parent_y = taxid_parent_coords.y
                        }
                    }
                    // Arcs data
                    if (d.pylifemap_dest_taxid !== undefined) {
                        const taxid_dest_coords = coords[d.pylifemap_dest_taxid]
                        if (taxid_dest_coords !== undefined) {
                            d.pylifemap_dest_x = taxid_dest_coords.x
                            d.pylifemap_dest_y = taxid_dest_coords.y
                        }
                    }
                })
            }
        }
    }
}

import { LIFEMAP_BACK_URL } from "./utils"

// Get up-to-date taxids coordinates from lifemap-back solr server
export async function get_coords(taxids) {
    const url_taxids = [...taxids].join(" ")
    const cache_key = `taxids_${url_taxids}`
    const cache_duration = 3600 * 1000 // 3600 seconds in milliseconds

    // Check if cached data exists and is still valid
    const cached_data = localStorage.getItem(cache_key)
    if (cached_data) {
        const { timestamp, data } = JSON.parse(cached_data)
        if (Date.now() - timestamp < cache_duration) {
            console.log("Returning cached data...")
            return data
        }
    }

    // If no valid cache, fetch from the backend
    const url = `${LIFEMAP_BACK_URL}/solr/taxo/select`
    const payload = {
        params: {
            q: "*:*",
            fq: `taxid:(${url_taxids})`,
            fl: "taxid,lat,lon",
            wt: "json",
            rows: taxids.size,
        },
    }
    let data = null
    try {
        const response = await fetch(url, {
            method: "post",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })
        data = await response.json()
        data = data.response.docs
    } catch (error) {
        console.error(error)
        return null
    }
    let result = {}
    data.forEach((d) => (result[d.taxid] = { x: d.lon[0], y: d.lat[0] }))

    try {
        // Store the result in localStorage with a timestamp
        localStorage.setItem(
            cache_key,
            JSON.stringify({ timestamp: Date.now(), data: result })
        )
    } catch (error) {
        console.warn("Can't store coordinates in local storage.")
    }

    return result
}

// Get sci_name and common_name of a taxid
export async function get_names(taxid) {
    if (taxid == 0) {
        return { taxid: 0, sci_name: "LUCA" }
    }
    const url = `${LIFEMAP_BACK_URL}/solr/taxo/select`
    const payload = {
        params: {
            q: "*:*",
            fq: `taxid:${taxid}`,
            fl: "taxid,sci_name",
            wt: "json",
            rows: 1,
        },
    }
    try {
        const response = await fetch(url, {
            method: "post",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })
        let data = await response.json()
        data = data.response.docs

        return data[0]
    } catch (error) {
        return null
    }
}

// Get popup title for taxid by querying scientific name from solr API
export async function get_popup_title(taxid) {
    const names = await get_names(taxid)
    let out = ""
    if (names !== null) {
        out += `<h2>${names["sci_name"]} <span>(${taxid})</span></h2>`
    } else {
        out += `<h2>${taxid}</h2>`
    }
    return out
}

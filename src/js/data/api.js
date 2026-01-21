import { fromLonLat } from "ol/proj"
import { LIFEMAP_BACK_URL } from "../utils"

// Get up-to-date taxids coordinates from lifemap-back solr server
export async function get_data_coords(taxids) {
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
    data.forEach((d) => {
        const coords = fromLonLat([d.lon[0], d.lat[0]])
        result[d.taxid] = { x: coords[0], y: coords[1] }
    })

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

// Fetch fields values for a given taxid
export async function fetch_taxid(taxid, fields) {
    if (taxid == 0) {
        return { taxid: 0, sci_name: "LUCA" }
    }
    const url = `${LIFEMAP_BACK_URL}/solr/taxo/select`
    const payload = {
        params: {
            q: "*:*",
            fq: `taxid:${taxid}`,
            fl: fields.join(","),
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

export async function fetch_suggestions(search, n = 10) {
    const url = `${LIFEMAP_BACK_URL}/solr/taxo/suggesthandler`
    const payload = {
        params: {
            "suggest.q": search,
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
        let suggestions = data["suggest"]["mySuggester"][search]["suggestions"]
        suggestions = suggestions.slice(0, n).map((d) => {
            let elems = d.term.split("|")
            return {
                sci_name: elems[0].trim(),
                common_name: elems[1].trim(),
                rank: elems[2].trim(),
                taxid: Number(elems[3].replace(/<\/?b>/g, "").trim()),
            }
        })
        return suggestions
    } catch (error) {
        return null
    }
}

// Get coordinates and zoom level of a taxid
export async function get_taxid_coords(taxid) {
    const result = await fetch_taxid(taxid, ["taxid", "lat", "lon", "zoom"])
    return result
}

// Get sci_name of a taxid
export async function get_taxid_name(taxid) {
    const result = await fetch_taxid(taxid, ["taxid", "sci_name"])
    return result
}

// Get popup title for taxid by querying scientific name from solr API
export async function get_popup_title(taxid) {
    const names = await get_taxid_name(taxid)
    let out = ""
    if (names !== null) {
        out += `<h2>${names["sci_name"]} <span>(<a href="https://lifemap.cnrs.fr/tree?tid=${taxid}" target="_blank">${taxid}</a>)</span></h2>`
    } else {
        out += `<h2>${taxid}</h2>`
    }
    return out
}

export async function get_suggestions(str) {}

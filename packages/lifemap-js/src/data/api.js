import { fromLonLat } from "ol/proj"
import { LUCA_LAT, LUCA_LON, LUCA_ZOOM, LIFEMAP_BACK_URL } from "../utils"
import { generate_hash } from "../utils"

// Parse an check a coordinates cache entry in sessionStorage
function parse_cached_data(key, wanted_key, cache_duration) {
    if (!key.startsWith("taxids_")) {
        return null
    }
    const cached_data = sessionStorage.getItem(key)
    let timestamp,
        data,
        cache_outdated = null
    try {
        ;({ timestamp, data } = JSON.parse(cached_data))
    } catch (e) {
        sessionStorage.removeItem(key)
        console.log(`Removed malformed cache entry for key ${key}`)
        return null
    }
    try {
        cache_outdated = Date.now() - timestamp > cache_duration
    } catch (e) {
        sessionStorage.removeItem(key)
        console.log(`Removed malformed timestamp cache entry for key ${key}`)
        return null
    }
    if (cache_outdated) {
        sessionStorage.removeItem(key)
        console.log(`Removed stale cache entry for key ${key}`)
        return null
    }
    if (key == wanted_key && !cache_outdated) {
        console.log("Returning cached coordinates...")
        return data
    }
    return null
}

// Get up-to-date taxids coordinates from lifemap-back solr server
export async function get_data_coords(taxids) {
    const url_taxids = [...taxids].join(" ")
    const cache_key = `taxids_${generate_hash(url_taxids)}`
    const cache_duration = 1800 * 1000 // 1800 seconds in milliseconds

    let data = null
    // Check cached items
    for (let key of Object.keys(sessionStorage)) {
        const parsed_data = parse_cached_data(key, cache_key, cache_duration)
        data = parsed_data ?? data
    }
    if (data !== null) {
        return data
    }
    // If no valid cache, fetch from the backend
    const url = `${LIFEMAP_BACK_URL}/solr/taxo/select`
    const payload = {
        params: {
            q: "*:*",
            fq: `taxid:(${url_taxids})`,
            fl: "taxid,lat,lon,zoom",
            wt: "json",
            rows: taxids.size,
        },
    }
    data = null
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
    // Add LUCA coordinates manually
    data.push({ taxid: 0, lon: [LUCA_LON], lat: [LUCA_LAT], zoom: [LUCA_ZOOM] })

    let result = {}
    data.forEach((d) => {
        const coords = fromLonLat([d.lon[0], d.lat[0]])
        result[d.taxid] = { x: coords[0], y: coords[1], zoom: d.zoom[0] }
    })

    try {
        // Store the result in sessionStorage with a timestamp
        sessionStorage.setItem(
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

// Get arc popup title for source and dest taxids by querying scientific name from solr API
export async function get_arc_popup_title(source_taxid, dest_taxid) {
    const source_names = await get_taxid_name(source_taxid)
    const dest_names = await get_taxid_name(dest_taxid)
    const source_name =
        source_names !== null
            ? `${source_names["sci_name"]} <span>(<a href="https://lifemap.cnrs.fr/tree?tid=${source_taxid}" target="_blank">${source_taxid}</a>)</span>`
            : source_taxid
    const dest_name =
        dest_names !== null
            ? `${dest_names["sci_name"]} <span>(<a href="https://lifemap.cnrs.fr/tree?tid=${dest_taxid}" target="_blank">${dest_taxid}</a>)</span>`
            : dest_taxid
    let out = `<h2>${source_name} - ${dest_name}</h2>`
    return out
}

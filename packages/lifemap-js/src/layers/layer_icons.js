import { get_popup_title } from "../data/api"
import { set_popup_event } from "../elements/popup"
import { setup_lazy_loading } from "../data/lazy_loading"
import { guidGenerator } from "../utils"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import VectorSource from "ol/source/Vector"
import VectorLayer from "ol/layer/Vector.js"
import { Style, Icon } from "ol/style.js"

export function layer_icons(map, data, options = {}) {
    let {
        id = null,
        width = null,
        height = null,
        scale = null,
        color = null,
        x_offset = 0,
        y_offset = 0,
        icon = null,
        x_anchor = 0.5,
        y_anchor = 0.5,
        opacity = 1.0,
        popup = false,
        popup_col = null,
        declutter = true,
        lazy = false,
        lazy_zoom = 10,
        icons_cache = {},
    } = options

    id = `lifemap-ol-${id ?? guidGenerator()}`

    // Check if icon is a fixed URL or a data column
    let icon_col = null
    if (
        typeof icon === "string" &&
        data.length > 0 &&
        Object.keys(data[0]).includes(icon)
    ) {
        icon_col = icon
    }

    // Create feature function
    function create_feature(d) {
        return new Feature({
            geometry: new Point([d["pylifemap_x"], d["pylifemap_y"]]),
            icon: icon_col === null ? icon : d[icon_col],
            data: popup ? d : null,
        })
    }

    // Initialize source
    const source = new VectorSource({ useSpatialIndex: !lazy || popup || hover })
    if (!lazy) {
        const features = data.map(create_feature)
        source.addFeatures(features)
    }

    const style_function = (feature) => {
        const icon = feature.get("icon")
        const style =
            icon === null
                ? null
                : new Style({
                      image: new Icon({
                          anchor: [x_anchor, y_anchor],
                          anchorXUnits: "fraction",
                          anchorYUnitsUnits: "fraction",
                          width: width ?? undefined,
                          height: height ?? undefined,
                          scale: scale ?? undefined,
                          displacement: [x_offset, y_offset],
                          src: icons_cache[icon],
                          color: color ?? undefined,
                      }),
                  })

        return style
    }

    // Layer definition
    const layer = new VectorLayer({
        source: source,
        style: style_function,
        declutter: declutter ? id : false,
        opacity: opacity,
    })

    // Lazy loading
    if (lazy) {
        setup_lazy_loading({
            map: map,
            data: data,
            source: source,
            create_feature_fn: create_feature,
            lazy_zoom: lazy_zoom,
            type: "points",
        })
    }

    // Popup
    if (popup) {
        const content_fn = popup_col
            ? (feature) => feature.get("data")[popup_col]
            : async (feature) => {
                  const taxid = feature.get("data")["pylifemap_taxid"]
                  let content = await get_popup_title(taxid)
                  return content
              }
        const coordinates_fn = (feature) => [
            feature.get("data").pylifemap_x,
            feature.get("data").pylifemap_y,
        ]
        set_popup_event(map, id, coordinates_fn, content_fn)
    }

    layer.lifemap_ol_id = id

    return layer
}

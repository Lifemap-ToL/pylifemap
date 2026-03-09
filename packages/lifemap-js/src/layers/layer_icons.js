import { get_popup_title } from "../data/api"
import { guidGenerator, is_data_column } from "../utils"

import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import VectorSource from "ol/source/Vector"
import VectorLayer from "ol/layer/Vector.js"
import { Style, Icon } from "ol/style.js"

export class IconsLayer {
    constructor(id, map, data, options = {}) {
        let {
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

        Object.assign(this, {
            width,
            height,
            scale,
            color,
            x_offset,
            y_offset,
            icon,
            x_anchor,
            y_anchor,
            opacity,
            popup,
            popup_col,
            declutter,
            lazy,
            lazy_zoom,
            icons_cache,
        })

        this.id = `lifemap-ol-${id ?? guidGenerator()}`
        this.map = map
        this.data = data

        this.is_webgl = false
        this.type = "ol"

        this.layers = []

        // Check if width is a fixed width or a data column
        this.icon_is_column = is_data_column(this.data, this.icon)

        this.layers.push(this.create_layer())
    }

    create_layer() {
        // Initialize source
        const source = new VectorSource({
            useSpatialIndex: !this.lazy || this.popup || this.hover,
        })

        // Layer definition
        const layer = new VectorLayer({
            source: source,
            style: this.get_style(),
            declutter: this.declutter ? this.id : false,
            opacity: this.opacity,
        })
        layer.id = this.id

        // Features creation
        const create_feature_fn = this.get_create_feature_fn()
        if (this.lazy) {
            this.map.setup_lazy_loading({
                data: this.data,
                source: source,
                create_feature_fn: create_feature_fn,
                lazy_zoom: this.lazy_zoom,
                type: "points",
            })
        } else {
            source.addFeatures(this.data.map(create_feature_fn))
        }

        // Popup
        if (this.popup) {
            this.map.add_popup_event({
                layer_id: layer.id,
                coordinates_fn: (feature) => [
                    feature.get("data").pylifemap_x,
                    feature.get("data").pylifemap_y,
                ],
                content_fn: this.get_popup_content_fn(),
            })
        }

        return layer
    }

    get_create_feature_fn() {
        return (d) =>
            new Feature({
                geometry: new Point([d["pylifemap_x"], d["pylifemap_y"]]),
                icon: this.icon_is_column ? d[this.icon] : this.icon,
                data: this.popup ? d : null,
            })
    }

    get_style() {
        return (feature) => {
            const icon = feature.get("icon")
            const style =
                icon === null
                    ? null
                    : new Style({
                          image: new Icon({
                              anchor: [this.x_anchor, this.y_anchor],
                              anchorXUnits: "fraction",
                              anchorYUnitsUnits: "fraction",
                              width: this.width ?? undefined,
                              height: this.height ?? undefined,
                              scale: this.scale ?? undefined,
                              displacement: [this.x_offset, this.y_offset],
                              src: this.icons_cache[icon],
                              color: this.color ?? undefined,
                          }),
                      })

            return style
        }
    }

    get_popup_content_fn() {
        return this.popup_col
            ? (feature) => feature.get("data")[this.popup_col]
            : async (feature) => {
                  const taxid = feature.get("data")["pylifemap_taxid"]
                  let content = await get_popup_title(taxid)
                  return content
              }
    }
}

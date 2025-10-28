import Overlay from "ol/Overlay"
import { fromLonLat } from "ol/proj"

export class Popup {
    constructor() {
        this.popup = this.create_popup()
        this.overlay = new Overlay({
            element: this.popup,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
        })
        this.is_shown = false
        this.popup.closer.onclick = () => {
            this.dispose()
            return false
        }
    }

    create_popup() {
        const container = document.createElement("div")
        container.id = "lifemap-popup"
        const content = document.createElement("div")
        content.id = "lifemap-popup-content"
        container.appendChild(content)
        const closer = document.createElement("div")
        closer.id = "lifemap-popup-closer"
        closer.innerHTML = "<a href='#'>✕</a>"
        container.appendChild(closer)

        container.content = content
        container.closer = closer

        container.addEventListener(
            "wheel",
            function (e) {
                // Prevent the default scroll behavior
                e.preventDefault()
            },
            { passive: false }
        )
        return container
    }

    dispose() {
        if (this.is_shown) {
            this.overlay.setPosition(undefined)
            this.popup.closer.blur()
            this.is_shown = false
        }
    }

    show(coordinates, content, offset = [0, 0]) {
        this.dispose()
        this.popup.content.innerHTML = content
        this.overlay.setPosition(fromLonLat(coordinates))
        this.overlay.setOffset(offset)
        this.is_shown = true
    }
}

// Add popup click event to a layer
export function set_popup_event(map, id, coordinates_fn, content_fn) {
    map.on("click", async function (ev) {
        const feature = map.forEachFeatureAtPixel(ev.pixel, (feature) => feature, {
            layerFilter: (d) => d.lifemap_ol_id == id,
        })
        if (!feature) {
            return
        }
        const content = await content_fn(feature)
        const coordinates = coordinates_fn(feature)
        const offset = [0, -5]
        map.popup.show(coordinates, content, offset)
    })
}

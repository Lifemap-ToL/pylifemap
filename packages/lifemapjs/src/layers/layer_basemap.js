// OL
import Map from "ol/Map"
import View from "ol/View"
import Overlay from "ol/Overlay.js"
import { DragPan, MouseWheelZoom, defaults } from "ol/interaction.js"
import { fromLonLat } from "ol/proj"
import FullScreen from "ol/control/FullScreen.js"
import { defaults as defaultControls } from "ol/control/defaults.js"
import { ResetZoomControl } from "../controls"

import { DEFAULT_LON, DEFAULT_LAT } from "../utils"

export function layer_basemap(el, options) {
    const { zoom = 5, minZoom = 4, maxZoom = 42 } = options

    const view = new View({
        center: fromLonLat([DEFAULT_LON, DEFAULT_LAT]),
        zoom: zoom,
        minZoom: minZoom,
        maxZoom: maxZoom,
        enableRotation: false,
        constrainResolution: false,
        smoothResolutionConstraint: false,
    })

    const controls = defaultControls()
    controls.extend([new FullScreen()])
    controls.extend([new ResetZoomControl()])

    let map = new Map({
        controls: controls,
        interactions: defaults({
            dragZoom: false,
            dragPan: false,
            mouseWheelZoom: false,
        }).extend([
            new DragPan({ duration: 0, kinetic: false }),
            new MouseWheelZoom({
                onFocusOnly: false,
                constrainResolution: false,
                maxDelta: 1,
                duration: 300,
                timeout: 100,
            }),
        ]),
        overlays: [],
        target: el,
        view,
        layers: [],
    })

    // Popup object
    const popup = create_popup()
    const popup_overlay = new Overlay({
        element: popup,
        autoPan: {
            animation: {
                duration: 250,
            },
        },
    })

    map.popup = popup
    map.popup_overlay = popup_overlay
    map.popup.is_shown = false
    map.addOverlay(popup_overlay)

    map.dispose_popup = function () {
        map.popup_overlay.setPosition(undefined)
        map.popup.closer.blur()
        return false
    }

    map.show_popup = function (coordinates, content, offset = [0, 0]) {
        if (map.popup.is_shown) {
            map.dispose_popup()
        }
        map.popup.content.innerHTML = content
        map.popup_overlay.setPosition(fromLonLat(coordinates))
        map.popup_overlay.setOffset(offset)
        map.popup.is_shown = true
    }

    map.popup.closer.onclick = map.dispose_popup

    function on_click() {
        if (map.popup.is_shown) {
            map.dispose_popup()
            map.popup.is_shown = false
        }
    }

    map.on("click", on_click)

    return map
}

function create_popup() {
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

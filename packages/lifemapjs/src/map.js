// OL
import Map from "ol/Map"
import View from "ol/View"
import { Popup } from "./elements/popup"
import { Spinner } from "./elements/spinner"
import { ErrorMessage } from "./elements/error_message"
import { DragPan, MouseWheelZoom, defaults } from "ol/interaction.js"
import { fromLonLat, transformExtent } from "ol/proj"
import { get_controls } from "./elements/controls"

import { DEFAULT_LON, DEFAULT_LAT, MAP_EXTENT } from "./utils"

export function create_map(el, options) {
    const { zoom = 5, minZoom = 4, maxZoom = 42, controls_list = [] } = options

    const view = new View({
        center: fromLonLat([DEFAULT_LON, DEFAULT_LAT]),
        extent: transformExtent(MAP_EXTENT, "EPSG:4326", "EPSG:3857"),
        zoom: zoom,
        minZoom: minZoom,
        maxZoom: maxZoom,
        enableRotation: false,
        constrainResolution: false,
        smoothResolutionConstraint: false,
    })

    const controls = get_controls(controls_list)

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

    // Popup
    map.popup = new Popup()
    map.addOverlay(map.popup.overlay)
    map.on("click", () => map.popup.dispose())

    // Spinner
    map.spinner = new Spinner(el)
    // Error message div
    map.error_message = new ErrorMessage(el)

    return map
}

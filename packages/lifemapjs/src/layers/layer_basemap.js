// OL
import Map from "ol/Map"
import View from "ol/View"
import { Popup } from "../elements/popup"
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
    map.popup = new Popup()
    map.addOverlay(map.popup.overlay)
    map.on("click", () => map.popup.dispose())

    return map
}

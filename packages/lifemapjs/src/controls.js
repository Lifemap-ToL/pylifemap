import Control from "ol/control/Control.js"
import { DEFAULT_LAT, DEFAULT_LON } from "./utils"
import { fromLonLat } from "ol/proj"

export class ResetZoomControl extends Control {
    /**
     * @param {Object} [opt_options] Control options.
     */
    constructor(opt_options) {
        const options = opt_options || {}

        const button = document.createElement("button")
        button.innerHTML = "⌂"

        const element = document.createElement("div")
        element.className = "reset-zoom pylifemap-control ol-unselectable ol-control"
        element.appendChild(button)

        super({
            element: element,
            target: options.target,
        })

        button.addEventListener("click", this.handleResetZoom.bind(this), false)
    }

    handleResetZoom() {
        const map = this.getMap()
        const view = map.getView()
        view.animate({
            center: fromLonLat([DEFAULT_LON, DEFAULT_LAT]),
            zoom: map.default_zoom,
        })
    }
}

export class LegendControl extends Control {
    constructor(opt_options) {
        const options = opt_options || {}

        const element = document.createElement("div")
        element.className = "lifemap-legend ol-unselectable ol-control"

        super({
            element: element,
            target: options.target,
        })
    }
}

import Control from "ol/control/Control.js"
import { DEFAULT_LAT, DEFAULT_LON } from "../utils"
import { fromLonLat } from "ol/proj"

export class ResetZoomControl extends Control {
    constructor(opt_options) {
        const options = opt_options || {}

        const button = document.createElement("button")
        button.setAttribute("title", "Reset zoom")
        button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" /></svg>'

        const element = document.createElement("div")
        element.className = "reset-zoom pylifemap-control ol-unselectable ol-control"
        element.style.top = "65px"
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

export class PngExportControl extends Control {
    constructor(opt_options) {
        const options = opt_options || {}

        const button = document.createElement("button")
        button.setAttribute("title", "Export to PNG")
        button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" /></svg>'

        const element = document.createElement("div")
        element.className = "png-export pylifemap-control ol-unselectable ol-control"
        element.style.top = "95px"
        element.appendChild(button)

        super({
            element: element,
            target: options.target,
        })

        button.addEventListener("click", this.handlePngExport.bind(this), false)
    }

    handlePngExport() {
        const map = this.getMap()
        const canvas = map.getTargetElement().querySelector(".ol-viewport canvas")
        console.log(canvas)
        canvas.toBlob((blob) => {
            const [, year, month, day] = new Date()
                .toISOString()
                .match(/^(\d{4})-(\d{2})-(\d{2})/)
            const filename = `pylifemap_${year}-${month}-${day}.png`
            const link = document.createElement("a")
            document.body.appendChild(link)
            link.href = URL.createObjectURL(blob)
            link.download = filename
            link.click()
            URL.revokeObjectURL(link.href)
            document.body.removeChild(link)
        }, "image/png")
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

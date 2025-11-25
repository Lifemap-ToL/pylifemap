import Control from "ol/control/Control.js"
import { DEFAULT_LAT, DEFAULT_LON } from "../utils"
import { fromLonLat } from "ol/proj"
import { snapdom } from "@zumer/snapdom"
import Attribution from "ol/control/Attribution.js"
import { defaults as defaultControls } from "ol/control/defaults.js"
import FullScreen from "ol/control/FullScreen"

export function get_controls(controls_list) {
    const default_controls_options = {
        zoom: controls_list.includes("zoom"),
        rotate: false,
        attribution: false,
    }

    const attribution = new Attribution({
        collapsible: false,
        attributions: `Basemap from <a href="https://lifemap.cnrs.fr">Lifemap</a>`,
    })

    let controls = defaultControls(default_controls_options).extend([attribution])
    let top = controls_list.includes("zoom") ? 75 : 10

    if (controls_list.includes("zoom") && controls_list.includes("reset_zoom")) {
        controls.extend([new ResetZoomControl()])
        top += 25
    }
    if (controls_list.includes("png_export")) {
        controls.extend([new PngExportControl({ top: top })])
    }
    if (controls_list.includes("full_screen")) {
        controls.extend([new FullScreen()])
    }

    return controls
}

class ResetZoomControl extends Control {
    constructor(opt_options) {
        const options = opt_options || {}

        const button = document.createElement("button")
        button.setAttribute("title", "Reset zoom")
        button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" /></svg>'

        const element = document.createElement("div")
        element.className = "reset-zoom pylifemap-control ol-unselectable ol-control"
        element.style.top = "60px"
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

class PngExportControl extends Control {
    constructor(opt_options) {
        const options = opt_options || {}
        const { top = 10 } = options

        const button = document.createElement("button")
        button.setAttribute("title", "Export to PNG")
        button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" /></svg>'

        const element = document.createElement("div")
        element.className = "png-export pylifemap-control ol-unselectable ol-control"
        element.style.top = `${top}px`
        element.appendChild(button)

        super({
            element: element,
            target: options.target,
        })

        button.addEventListener("click", this.handlePngExport.bind(this), false)
    }

    async handlePngExport() {
        const el = this.getMap().getTargetElement()

        const canvases = el.querySelectorAll(".ol-viewport canvas")

        const result_canvas = document.createElement("canvas")
        result_canvas.width = canvases[0].width
        result_canvas.height = canvases[0].height

        const result_ctx = result_canvas.getContext("2d")
        result_ctx.fillStyle = "black"
        result_ctx.fillRect(0, 0, result_canvas.width, result_canvas.height)

        // Draw each canvas onto the result canvas in order
        canvases.forEach((c) => {
            result_ctx.drawImage(c, 0, 0)
        })

        // Draw legend
        const legend_element = el.querySelector(".lifemap-legend")
        if (legend_element) {
            const legend_canvas = await snapdom.toCanvas(legend_element)
            const legend_x = result_canvas.width - legend_canvas.width - 10
            const legend_y = result_canvas.height - legend_canvas.height - 10
            result_ctx.drawImage(legend_canvas, legend_x, legend_y)
        }

        result_canvas.toBlob((blob) => {
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

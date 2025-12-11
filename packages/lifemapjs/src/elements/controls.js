import Control from "ol/control/Control.js"
import { DEFAULT_LAT, DEFAULT_LON } from "../utils"
import { fromLonLat } from "ol/proj"
import { snapdom } from "@zumer/snapdom"
import Attribution from "ol/control/Attribution.js"
import { defaults as defaultControls } from "ol/control/defaults.js"
import FullScreen from "ol/control/FullScreen"
import { SearchDialog } from "./search"

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
    if (controls_list.includes("search")) {
        controls.extend([new TaxaSearchControl({ top: top })])
        top += 40
    }
    if (controls_list.includes("png_export")) {
        controls.extend([new PngExportControl({ top: top })])
    }
    if (controls_list.includes("full_screen")) {
        controls.extend([new FullScreen()])
    }

    return controls
}

class TaxaSearchControl extends Control {
    constructor(opt_options) {
        const options = opt_options || {}
        const { top = 10 } = options

        const search_container = document.createElement("div")
        search_container.className =
            "lifemap-search pylifemap-control ol-unselectable ol-control"
        search_container.style.top = `${top}px`

        super({
            element: search_container,
            target: options.target,
        })

        const search_control = document.createElement("div")
        search_control.className = "pylifemap-control ol-unselectable ol-control"
        const search_button = document.createElement("button")
        search_button.setAttribute("title", "Search")
        search_button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>magnify</title><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" /></svg>'
        search_container.appendChild(search_button)

        search_button.addEventListener("click", this.handleTaxaSearch.bind(this), false)

        this.search_container = search_container
        this.search_button = search_button
    }

    handleTaxaSearch() {
        if (this.search_dialog === undefined) {
            const search_dialog = new SearchDialog(this.search_container, this.getMap())
            this.search_dialog = search_dialog
        }
        if (this.search_dialog.dialog.open) {
            this.search_dialog.dialog.close()
            this.search_button.classList.remove("selected")
        } else {
            this.search_dialog.dialog.show()
            this.search_button.classList.add("selected")
        }
    }
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
        const map = this.getMap()
        const el = map.getTargetElement()

        const canvases = el.querySelectorAll(".ol-viewport canvas")

        const result_canvas = document.createElement("canvas")
        result_canvas.width = canvases[0].width
        result_canvas.height = canvases[0].height

        const result_ctx = result_canvas.getContext("2d")
        result_ctx.fillStyle = map.theme.background_color
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

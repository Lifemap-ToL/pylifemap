import Control from "ol/control/Control.js"
import { snapdom } from "@zumer/snapdom"
import { THEMES } from "../themes"

export class ExportControl extends Control {
    constructor(options) {
        const { top, base_map } = options

        const container = document.createElement("div")
        container.className = "export pylifemap-control ol-unselectable ol-control"
        container.style.top = `${top}em`

        super({
            element: container,
            target: options.target,
        })
        this.base_map = base_map

        const button = document.createElement("button")
        button.setAttribute("title", "Export")
        button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" /></svg>'
        container.appendChild(button)

        button.addEventListener("click", () => this.handle_click(), false)

        this.container = container
        this.button = button
        this.dialog = new ExportDialog(this.container, this.button, this.base_map)
    }

    handle_click() {
        if (this.dialog.dialog.open) {
            this.dialog.hide()
        } else {
            if ("settings" in this.base_map.controls) {
                this.base_map.controls.settings.dialog.hide()
            }
            if ("taxa_search" in this.base_map.controls) {
                this.base_map.controls.taxa_search.dialog.hide()
            }
            this.dialog.show()
        }
    }
}

class ExportDialog {
    constructor(el, button, base_map) {
        this.base_map = base_map

        // Dialog
        const dialog = document.createElement("dialog")
        const export_png_item = document.createElement("div")
        export_png_item.innerText = "Export current view (PNG)"
        dialog.appendChild(export_png_item)
        el.appendChild(dialog)

        this.button = button
        this.dialog = dialog

        export_png_item.addEventListener(
            "click",
            (event) => this.handle_png_export(event),
            false
        )

        dialog.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.hide()
            }
        })
    }

    show() {
        this.button.classList.add("selected")
        this.dialog.show()
    }

    hide() {
        this.button.classList.remove("selected")
        this.dialog.close()
    }

    async handle_png_export() {
        const el = this.base_map.map.getTargetElement()

        const canvases = el.querySelectorAll(".ol-viewport canvas")

        const result_canvas = document.createElement("canvas")
        result_canvas.width = canvases[0].width
        result_canvas.height = canvases[0].height

        const result_ctx = result_canvas.getContext("2d")
        const bg_color = THEMES[this.base_map.theme].background_color
        result_ctx.fillStyle = bg_color
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

import Control from "ol/control/Control.js"

export class ResetZoomControl extends Control {
    constructor(options = {}) {
        const { top, base_map } = options

        const button = document.createElement("button")
        button.setAttribute("title", "Reset zoom")
        button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" /></svg>'

        const element = document.createElement("div")
        element.className = "reset-zoom pylifemap-control ol-unselectable ol-control"
        element.style.top = `${top}em`
        element.appendChild(button)

        super({
            element: element,
            target: options.target,
        })
        this.base_map = base_map

        button.addEventListener(
            "click",
            () => this.base_map.reset_view({ animate: true }),
            false
        )
    }
}

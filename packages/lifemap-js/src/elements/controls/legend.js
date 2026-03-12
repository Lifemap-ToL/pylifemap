import Control from "ol/control/Control.js"

export class LegendControl extends Control {
    constructor(options = {}) {
        const {} = options

        const element = document.createElement("div")
        element.className = "lifemap-legend ol-unselectable ol-control"

        super({
            element: element,
            target: options.target,
        })
        this.element = element
    }

    show() {
        this.element.style.display = "block"
    }

    hide() {
        this.element.style.display = "none"
    }
}

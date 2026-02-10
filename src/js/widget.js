import { Lifemap } from "../../packages/lifemap-js/"

import "../../packages/lifemap-js/css/lifemap.css"

// Data value change callback
async function _onDataLayersChanged(model, lifemap) {
    let data = () => model.get("data")
    let layers = () => model.get("layers")
    let color_ranges = () => model.get("color_ranges")
    lifemap.update({ data: data(), layers: layers(), color_ranges: color_ranges() })
}

// Width value change callback
function _onWidthChanged(model, lifemap) {
    let width = () => model.get("width")
    lifemap.update_container({ width: width() })
}

// Height value change callback
function _onHeightChanged(model, lifemap) {
    let height = () => model.get("height")
    lifemap.update_container({ height: height() })
}

export default {
    initialize({ model }) {},

    render({ model, el }) {
        // Traitlets
        let width = () => model.get("width")
        let height = () => model.get("height")
        let data = () => model.get("data")
        let layers = () => model.get("layers")
        let options = () => model.get("options")
        let color_ranges = () => model.get("color_ranges")

        // Add container div
        const container = document.createElement("div")
        el.appendChild(container)

        // Create map
        let lifemap_options = options()
        lifemap_options.width = width()
        lifemap_options.height = height()
        let lifemap = new Lifemap(container, lifemap_options)
        lifemap.update({ data: data(), layers: layers(), color_ranges: color_ranges() })

        // Add traitlets change callback
        model.on("change:data", () => _onDataLayersChanged(model, lifemap))
        model.on("change:layers", () => _onDataLayersChanged(model, lifemap))
        model.on("change:width", () => _onWidthChanged(model, lifemap))
        model.on("change:height", () => _onHeightChanged(model, lifemap))

        // Cleanup function
        return () => {
            lifemap.destroy()
            lifemap = null
            container.remove()
        }
    },
}

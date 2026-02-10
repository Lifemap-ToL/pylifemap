import { Lifemap } from "../../packages/lifemap-js/src/lifemap"

import "../../packages/lifemap-js/css/lifemap.css"

// Data value change callback
async function _onDataChanged(model, lifemap) {
    let data = () => model.get("data")
    let layers = () => model.get("layers")
    let color_ranges = () => model.get("color_ranges")
    lifemap.update_data(data()).then(() => {
        lifemap
            .update_layers(layers(), color_ranges())
            .then(async () => await lifemap.update_zoom())
    })
}

// Layers value change callback
async function _onLayersChanged(model, lifemap) {
    let layers = () => model.get("layers")
    let color_ranges = () => model.get("color_ranges")
    lifemap.spinner.show("Updating data")
    requestAnimationFrame(() => {
        lifemap
            .update_layers(layers(), color_ranges())
            .then(async () => await lifemap.update_zoom())
            .then(lifemap.spinner.hide())
    })
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

        lifemap.spinner.show("Processing data")
        requestAnimationFrame(() => {
            lifemap.update_data(data()).then(() => {
                lifemap.spinner.update_message("Creating layers")
                lifemap
                    .update_layers(layers(), color_ranges())
                    .then(async () => {
                        lifemap.spinner.update_message("Updating view")
                        await lifemap.update_zoom()
                    })
                    .then(lifemap.spinner.hide())
            })
        })

        // Add traitlets change callback
        model.on("change:data", () => _onDataChanged(model, lifemap))
        model.on("change:layers", () => _onLayersChanged(model, lifemap))
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

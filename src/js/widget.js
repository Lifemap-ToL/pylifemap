import { Lifemap } from "./lifemap"

import "../css/lifemap.css"

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
function _onWidthChanged(model, el) {
    let width = () => model.get("width")
    let container = el.querySelector(":scope > .pylifemap-map")
    container.style.width = width()
}

// Height value change callback
function _onHeightChanged(model, el) {
    let height = () => model.get("height")
    let container = el.querySelector(":scope > .pylifemap-map")
    container.style.height = height()
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
        container.style.height = height()
        container.style.width = width()
        container.classList.add("pylifemap-map")
        el.appendChild(container)

        // Create map
        let lifemap = new Lifemap(container, options())

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
        model.on("change:width", () => _onWidthChanged(model, el))
        model.on("change:height", () => _onHeightChanged(model, el))

        // Cleanup function
        return () => {
            lifemap.spinner.show("Cleaning up widget")
            console.log("Disposing OpenLayers layers...")
            lifemap.dispose_ol_layers()
            console.log("Disposing Deck.gl...")
            lifemap.dispose_deck()
            lifemap.spinner.hide()
            // Garbage collection
            lifemap = null
            layers = null
            data = null
        }
    },
}

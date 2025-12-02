import { Lifemap } from "lifemapjs"

import "./styles.css"

// Data value change callback
async function _onDataChanged(model, map) {
    let data = () => model.get("data")
    let layers = () => model.get("layers")
    let color_ranges = () => model.get("color_ranges")
    map.update_data(data()).then(() => {
        map.update_layers(layers(), color_ranges()).then(
            async () => await map.update_zoom()
        )
    })
}

// Layers value change callback
async function _onLayersChanged(model, map) {
    let layers = () => model.get("layers")
    let color_ranges = () => model.get("color_ranges")
    map.update_layers(layers(), color_ranges()).then(async () => await map.update_zoom())
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
        const map = new Lifemap(container, options())
        map.update_data(data()).then(() => {
            map.update_layers(layers(), color_ranges()).then(
                async () => await map.update_zoom()
            )
        })

        // Add traitlets change callback
        model.on("change:data", () => _onDataChanged(model, map))
        model.on("change:layers", () => _onLayersChanged(model, map))
        model.on("change:width", () => _onWidthChanged(model, el))
        model.on("change:height", () => _onHeightChanged(model, el))
    },
}

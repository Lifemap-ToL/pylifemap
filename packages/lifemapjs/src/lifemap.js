import { create_map } from "./map"
import { layer_labels } from "./layers/layer_labels"
import { layer_heatmap } from "./layers/layer_heatmap"
import { layer_points } from "./layers/layer_points"
import { layer_heatmap_deck } from "./layers/layer_heatmap_deck"
import { layer_screengrid } from "./layers/layer_screengrid"
import { layer_lines } from "./layers/layer_lines"
import { layer_donuts } from "./layers/layer_donuts"
import { layer_deck } from "./layers/layer_deck"
import { layer_tiles } from "./layers/layer_tiles"
import { layer_text } from "./layers/layer_text"
import { layer_icons } from "./layers/layer_icons"
import { LegendControl } from "./elements/controls"
import { get_coords } from "./api"
import { unserialize_data, stringify_scale } from "./utils"
import { THEMES } from "./elements/themes"

import * as Plot from "@observablehq/plot"

const DECK_LAYERS = ["heatmap_deck", "screengrid"]
const MAX_SOLR_QUERY = 100000
const LANG = "en"

export class Lifemap {
    constructor(el, options = {}) {
        const {
            zoom = 5,
            legend_width = undefined,
            controls = [],
            hide_labels = false,
            theme = "dark",
        } = options
        // Base map object
        this.map = create_map(el, { zoom: zoom, controls_list: controls })
        this.map.default_zoom = zoom
        this.map.theme = THEMES[theme]

        // Tiles layer
        const tiles_layer = layer_tiles(this.map, LANG)
        this.base_layers = [tiles_layer]
        // Labels layer
        if (!hide_labels) {
            const labels_layer = layer_labels(this.map)
            this.base_layers.push(labels_layer)
        }

        // Deck.gl init
        const { deck_layer, deck } = layer_deck(el, zoom)
        this.deck = deck
        this.deck.base_layer = deck_layer

        this.deck_layers = []
        this.ol_layers = []

        this.legend = new LegendControl()
        this.legend_width = legend_width
        this.scales = []
        this.data = undefined
    }

    async update_data(data) {
        this.map.spinner.show()
        let deserialized_data = {}
        let taxids = new Set()
        for (let k in data) {
            let current_data = unserialize_data(data[k])
            deserialized_data[k] = current_data
            taxids = taxids.union(new Set(current_data.map((d) => d.taxid)))
        }
        if (taxids.size > MAX_SOLR_QUERY) {
            console.log("Too many taxids to query for up-to-date coordinates.")
        }
        if (taxids.size > 0 && taxids.size <= MAX_SOLR_QUERY) {
            console.log("Getting up-to-date taxids coordinates...")
            // Get up-to-date coordinates from lifemap-back solr
            let coords = await get_coords(taxids)
            // If query succeeded, update coordinates with new values
            if (coords !== null) {
                for (let k in deserialized_data) {
                    deserialized_data[k].forEach((d) => {
                        const taxid_coords = coords[d.taxid]
                        if (taxid_coords !== undefined) {
                            if (d.pylifemap_x !== undefined) {
                                d.pylifemap_x = taxid_coords.x
                                d.pylifemap_y = taxid_coords.y
                            }
                            if (d.pylifemap_x0 !== undefined) {
                                d.pylifemap_x0 = taxid_coords.x
                                d.pylifemap_y0 = taxid_coords.y
                            }
                        }
                        if (d.pylifemap_parent !== undefined) {
                            const taxid_parent_coords = coords[d.pylifemap_parent]
                            if (taxid_parent_coords !== undefined) {
                                d.pylifemap_x1 = taxid_parent_coords.x
                                d.pylifemap_y1 = taxid_parent_coords.y
                            }
                        }
                    })
                }
            }
        }
        this.data = deserialized_data
        this.map.spinner.hide()
    }

    create_layers(layers_def_list) {
        layers_def_list = Array.isArray(layers_def_list)
            ? layers_def_list
            : [layers_def_list]
        let layers_list = layers_def_list.map((l) => {
            // Get data
            const layer_id = l.options.id
            let layer_data = this.data[layer_id]
            switch (l.layer) {
                case "points":
                    return layer_points(this.map, layer_data, l.options ?? {})
                case "lines":
                    return layer_lines(this.map, layer_data, l.options ?? {})
                case "heatmap":
                    return layer_heatmap(layer_data, l.options ?? {})
                case "heatmap_deck":
                    return layer_heatmap_deck(layer_data, l.options ?? {})
                case "screengrid":
                    return layer_screengrid(layer_data, l.options ?? {})
                case "donuts":
                    return layer_donuts(this.map, layer_data, l.options ?? {})
                case "text":
                    return layer_text(this.map, layer_data, l.options ?? {})
                case "icons":
                    return layer_icons(this.map, layer_data, l.options ?? {})
                default:
                    console.warn(`Invalid layer type: ${l.layer}`)
                    return undefined
            }
        })
        return layers_list.flat()
    }

    update_layers(layers_def_list) {
        this.map.spinner.show()
        this.dispose_webgl_layers()

        const deck_layers_def = layers_def_list.filter((d) =>
            DECK_LAYERS.includes(d.layer)
        )
        this.deck_layers =
            deck_layers_def.length == 0 ? [] : this.create_layers(deck_layers_def)

        const ol_layers_def = layers_def_list.filter(
            (d) => !DECK_LAYERS.includes(d.layer)
        )
        this.ol_layers =
            ol_layers_def.length == 0 ? [] : this.create_layers(ol_layers_def)

        let layers = [...this.base_layers, ...this.ol_layers]
        if (this.deck_layers.length > 0) {
            layers = [this.deck.base_layer, ...layers]
            this.deck.setProps({ layers: this.deck_layers })
        }

        this.map.setLayers(layers)
        this.update_scales()

        this.map.spinner.hide()
    }

    dispose_webgl_layers() {
        this.map
            .getLayers()
            .getArray()
            .forEach((l) => {
                if (l.is_webgl) {
                    this.map.removeLayer(l)
                    l.dispose()
                }
            })
    }

    // Update scales from layers
    update_scales() {
        let scales = this.ol_layers
            .filter((d) => d.lifemap_ol_scales)
            .map((d) => d.lifemap_ol_scales)
            .flat()

        // Remove duplicated scales
        let unique_scales = {}
        scales.forEach((scale) => {
            if (this.legend_width) scale.width = this.legend_width
            const key = stringify_scale(scale)
            unique_scales[key] = scale
        })
        unique_scales = Object.values(unique_scales)
        if (stringify_scale(this.scales) != stringify_scale(unique_scales)) {
            this.scales = unique_scales
            this.update_legend()
        }
    }

    // Create legend from scales
    update_legend() {
        this.map.removeControl(this.legend)
        if (this.scales.length == 0) {
            return
        }

        let legend_container = document.createElement("div")
        if (this.legend_width) {
            legend_container.style.width = this.legend_width
        }
        // Add legends
        for (let scale of Object.values(this.scales)) {
            if (scale.color.type == "categorical") {
                const legend_label = document.createElement("div")
                legend_label.classList.add("legend-title")
                legend_label.innerHTML = scale.label
                legend_container.append(legend_label)
            }
            legend_container.append(Plot.legend(scale))
        }
        this.legend.element.appendChild(legend_container)
        this.map.addControl(this.legend)
    }
}

import { BaseMap } from "./base_map"
import { HeatmapLayer } from "./layers/layer_heatmap"
import { PointsLayer } from "./layers/layer_points"
import { LinesLayer } from "./layers/layer_lines"
import { DonutsLayer } from "./layers/layer_donuts"
import { TextLayer } from "./layers/layer_text"
import { IconsLayer } from "./layers/layer_icons"
import { LabelsLayer } from "./layers/layer_labels"
import { DeckLayer } from "./layers/layer_deck"
import { HeatmapDeckLayer } from "./layers/layer_heatmap_deck"
import { ScreengridLayer } from "./layers/layer_screengrid"
import { ArcsLayer } from "./layers/layer_arcs"
import { ArcsDeckLayer } from "./layers/layer_arcs_deck"

import { ErrorMessage } from "./elements/error"

import { deserialize_data } from "./data/deserialization"
import { update_coordinates } from "./data/update_coordinates"

import { stringify_scale, LANG } from "./utils"

import { Spinner } from "./elements/spinner"

export class Lifemap {
    constructor(el, options = {}) {
        const {
            width = 600,
            height = 600,
            center = "default",
            zoom = undefined,
            legend_width = undefined,
            controls = [
                "zoom",
                "reset_zoom",
                "png_export",
                "search",
                "settings",
                "full_screen",
            ],
            hide_labels = false,
            hide_legend = false,
            theme = "dark",
        } = options

        // Init container
        this.el = el
        this.el.classList.add("pylifemap-map")
        this.update_container({ width: width, height: height })

        // Theme
        this.theme = theme

        // Base map object
        this.base_map = new BaseMap(el, {
            zoom: zoom,
            controls_list: controls,
            center: center,
            theme: this.theme,
            legend_width: legend_width,
            hide_legend: hide_legend,
            lang: LANG,
        })

        // Tiles layer
        this.base_layers = [this.base_map.tiles_layer]
        // Labels layer
        if (!hide_labels) {
            const labels_layer = new LabelsLayer(this.base_map, this.theme).layer
            this.base_layers.push(labels_layer)
        }
        // Data layers
        this.data_layers = []

        this.scales = []
        this.data = undefined

        // Global spinner
        this.spinner = new Spinner(el)

        // Error message
        this.error_message = new ErrorMessage(this.el)
    }

    get_ol_layers(options = {}) {
        let { filter_lazy = false } = options
        let layers = this.data_layers.filter((d) => d.type == "ol")
        if (filter_lazy) {
            layers = layers.filter((d) => !d.lazy)
        }
        return layers.map((d) => d.layers).flat()
    }

    get_deck_layers() {
        return this.data_layers
            .filter((d) => d.type == "deck")
            .map((d) => d.layers)
            .flat()
    }

    update_container(options) {
        const { width = undefined, height = undefined } = options
        if (width !== undefined) {
            this.el.style.width = width
        }
        if (height !== undefined) {
            this.el.style.height = height
        }
    }

    async update(options) {
        const { data, layers, color_ranges } = options
        const is_update = this.data_layers.length > 0
        this.spinner.show("Processing data")
        requestAnimationFrame(() => {
            this.update_data(data).then(() => {
                this.spinner.update_message("Creating layers")
                this.update_layers(layers, color_ranges)
                    .then(async () => {
                        if (!is_update) {
                            this.spinner.update_message("Updating view")
                            await this.base_map.init_view({
                                // We filter out lazy loading layers in case center is "auto"
                                ol_layers: this.get_ol_layers({ filter_lazy: true }),
                                animate: false,
                            })
                        }
                    })
                    .then(this.spinner.hide())
            })
        })
    }

    async update_data(data) {
        try {
            // Deserialize data
            this.spinner.update_message("Deserializing data")
            let deserialized_data = {}
            for (let k in data) {
                deserialized_data[k] = deserialize_data(data[k])
            }
            // Update coordinates
            this.spinner.update_message("Getting up-to-date taxids coordinates")
            await update_coordinates(deserialized_data)
            this.data = deserialized_data
        } catch (e) {
            this.error_message.show_message(e)
            console.error(e)
        }
    }

    async update_layers(layers_def, color_ranges) {
        try {
            this.dispose_ol_layers()
            const base_layers = this.base_layers

            this.data_layers = await this.create_layers(layers_def, color_ranges)
            const ol_layers = this.get_ol_layers()
            const deck_layers = this.get_deck_layers()

            if (deck_layers.length == 0) {
                if (this.deck !== undefined) {
                    this.deck.setProps({ layers: [] })
                }
            }
            if (deck_layers.length > 0) {
                if (this.deck === undefined) {
                    await this.init_deck()
                }
                base_layers.push(this.deck.base_layer)
                this.deck.setProps({ layers: deck_layers })
            }

            this.base_map.map.setLayers([...base_layers, ...ol_layers])

            this.update_scales()
        } catch (e) {
            this.error_message.show_message(e)
            console.error(e)
        }
    }

    async create_layers(layers_def, color_ranges) {
        if (layers_def.length == 0) {
            return []
        }
        layers_def = Array.isArray(layers_def) ? layers_def : [layers_def]
        let layers_list = layers_def.map(async (l) => {
            // Get data
            const layer_id = l.id
            let layer_data = this.data[layer_id]
            if (layer_data.length == 0) {
                return undefined
            }

            switch (l.layer) {
                // Deck.gl layers
                case "arcs_deck":
                    const arcs_deck_layer = new ArcsDeckLayer(
                        layer_id,
                        layer_data,
                        l.options ?? {}
                    )
                    await arcs_deck_layer.init()
                    return arcs_deck_layer
                case "heatmap_deck":
                    const heatmap_deck_layer = new HeatmapDeckLayer(
                        layer_id,
                        layer_data,
                        l.options ?? {}
                    )
                    await heatmap_deck_layer.init()
                    return heatmap_deck_layer
                case "screengrid":
                    const screengrid_layer = new ScreengridLayer(
                        layer_id,
                        layer_data,
                        l.options ?? {}
                    )
                    await screengrid_layer.init()
                    return screengrid_layer
                // OpenLayers layers
                case "points":
                    return new PointsLayer(
                        layer_id,
                        this.base_map,
                        layer_data,
                        l.options ?? {},
                        color_ranges
                    )
                case "lines":
                    return new LinesLayer(
                        layer_id,
                        this.base_map,
                        layer_data,
                        l.options ?? {},
                        color_ranges
                    )
                case "arcs":
                    return new ArcsLayer(
                        layer_id,
                        this.base_map,
                        layer_data,
                        l.options ?? {},
                        color_ranges
                    )
                case "heatmap":
                    return new HeatmapLayer(layer_id, layer_data, l.options ?? {})
                case "donuts":
                    return new DonutsLayer(
                        layer_id,
                        this.base_map,
                        layer_data,
                        l.options ?? {}
                    )
                case "text":
                    return new TextLayer(
                        layer_id,
                        this.base_map,
                        layer_data,
                        l.options ?? {}
                    )
                case "icons":
                    return new IconsLayer(
                        layer_id,
                        this.base_map,
                        layer_data,
                        l.options ?? {}
                    )
                default:
                    throw new Error(`Invalid layer type: ${l.layer}`)
            }
        })
        const layers = await Promise.all(layers_list)
        return layers.filter((d) => d !== undefined).flat()
    }

    async init_deck() {
        const deck_creator = new DeckLayer(this.el, this.zoom)
        await deck_creator.init()
        this.deck = deck_creator.deck
        this.deck.base_layer = deck_creator.deck_layer
    }

    dispose_ol_layers() {
        this.base_map.map
            .getLayers()
            .getArray()
            .forEach((l) => {
                // Do not touch map and label layers in case of update
                if (!this.base_layers.includes(l)) {
                    l.setSource(null)
                    if (l.is_webgl) {
                        l.dispose()
                    }
                    this.base_map.map.removeLayer(l)
                    l = null
                } else {
                    this.base_map.map
                        .getView()
                        .setZoom(this.base_map.map.getView().getZoom())
                }
            })
    }

    dispose_deck() {
        if (this.deck) {
            this.deck.finalize()
            this.deck = null
        }
    }

    // Update scales from layers
    update_scales() {
        let scales = this.data_layers
            .map((d) => d.scales)
            .filter((d) => d !== undefined)
            .flat()

        // Remove duplicated scales
        let unique_scales = {}
        scales.forEach((scale) => {
            const key = stringify_scale(scale)
            unique_scales[key] = scale
        })
        unique_scales = Object.values(unique_scales)
        this.scales = unique_scales
        this.base_map.update_legend(this.scales)
    }

    destroy() {
        this.spinner.show("Cleaning up widget")
        console.log("Disposing OpenLayers layers...")
        this.dispose_ol_layers()
        console.log("Disposing Deck.gl...")
        this.dispose_deck()
        this.spinner.hide()
    }
}

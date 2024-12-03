import { layer_ol } from "./layers/layer_ol";
import { layer_heatmap } from "./layers/layer_heatmap";
import { layer_points } from "./layers/layer_points";
import { layer_points_ol } from "./layers/layer_points_ol";
import { layer_grid } from "./layers/layer_grid";
import { layer_screengrid } from "./layers/layer_screen_grid";
import { layer_lines } from "./layers/layer_lines";
import { layer_donuts } from "./layers/layer_donuts";
import { unserialize_data, stringify_scale } from "./utils";

import { Deck } from "@deck.gl/core";
import { Layer } from "ol/layer";
import { toLonLat } from "ol/proj";
import { Control, defaults as defaultControls } from "ol/control.js";

import * as Plot from "@observablehq/plot";

const OL_LAYERS = ["donuts", "points_ol"];

class LegendControl extends Control {
    constructor(opt_options) {
        const options = opt_options || {};

        const element = document.createElement("div");
        element.className = "lifemap-legend ol-unselectable ol-control";

        super({
            element: element,
            target: options.target,
        });
    }
}

// Main function
export function lifemap(el, data, layers, options = {}) {
    const { zoom = 5, legend_width = undefined } = options;

    // Create deck.gl layer
    const deck = new Deck({
        initialViewState: { longitude: 0, latitude: -4.226497, zoom: 5 },
        controller: false,
        useDevicePixels: false,
        parent: el,
        style: { pointerEvents: "none", "z-index": 1 },
        layers: [],
    });

    const deck_layer = new Layer({
        render({ size, viewState }) {
            const [width, height] = size;
            const [longitude, latitude] = toLonLat(viewState.center);
            const zoom = viewState.zoom - 1;
            const bearing = 0;
            const deckViewState = { bearing, longitude, latitude, zoom };
            deck.setProps({ width, height, viewState: deckViewState });
            deck.redraw();
        },
    });

    // Base map object
    let map = layer_ol(el, deck_layer, { zoom: zoom });

    // Legend control
    map.legend = new LegendControl();
    // Current scales
    map.scales = undefined;
    // Data
    map.data = undefined;
    // OL layers
    map.ol_layers = undefined;

    // Create layer from layer definition object
    function create_layer(layer_def) {
        // Get data
        const layer_id = layer_def.options.id;
        let layer_data = map.data[layer_id];
        switch (layer_def.layer) {
            case "points_ol":
                return layer_points_ol(map, layer_data, layer_def.options ?? {});
            case "points":
                return layer_points(map, layer_data, layer_def.options ?? {});
            case "lines":
                return layer_lines(map, layer_data, layer_def.options ?? {});
            case "heatmap":
                return layer_heatmap(map, layer_data, layer_def.options ?? {});
            case "grid":
                return layer_grid(map, layer_data, layer_def.options ?? {});
            case "screengrid":
                return layer_screengrid(map, layer_data, layer_def.options ?? {});
            case "donuts":
                return layer_donuts(map, layer_data, layer_def.options ?? {});
            default:
                console.warn(`Invalid layer type: ${layer_def.layer}`);
                return undefined;
        }
    }

    // Convert layer definitions to layers
    function convert_layers(layers_list, map) {
        layers_list = Array.isArray(layers_list) ? layers_list : [layers_list];
        layers_list = layers_list.map((l) => create_layer(l, map));
        return layers_list.flat();
    }

    // Create legend from scales
    function update_legend(scales) {
        if (scales.length == 0) {
            map.removeControl(map.legend);
            return;
        }

        let div_legend = document.createElement("div");
        if (legend_width) {
            div_legend.style.width = legend_width;
        }
        // Add legends
        for (let scale of Object.values(scales)) {
            if (scale.color.type == "categorical") {
                const legend_label = document.createElement("div");
                legend_label.classList.add("legend-title");
                legend_label.innerHTML = scale.label;
                div_legend.append(legend_label);
            }
            div_legend.append(Plot.legend(scale));
        }
        map.legend.element.appendChild(div_legend);
        map.addControl(map.legend);
    }

    // Update scales from layers
    function update_scales(layers) {
        let scales = layers
            .filter((d) => d.lifemap_ol_scales)
            .map((d) => d.lifemap_ol_scales)
            .flat();

        // Remove duplicated scales
        let unique_scales = {};
        scales.forEach((scale) => {
            if (legend_width) scale.width = legend_width;
            const key = stringify_scale(scale);
            unique_scales[key] = scale;
        });
        unique_scales = Object.values(unique_scales);
        if (map.scales != stringify_scale(unique_scales)) {
            update_legend(unique_scales);
            map.scales = stringify_scale(unique_scales);
        }
    }

    // Update deck layers from layers definition list
    function update_deck_layers(layers_def) {
        const list = layers_def.filter((d) => !OL_LAYERS.includes(d.layer));
        let layers = list.length == 0 ? [] : convert_layers(list, map);
        deck.setProps({ layers: layers });
        update_scales(layers);
    }

    // Update OL layers from layers definition list
    function update_ol_layers(layers_def) {
        const layers_list = layers_def.filter((d) => OL_LAYERS.includes(d.layer));
        const ol_layers = convert_layers(layers_list, map);
        if (layers_list.length == 0) return;
        // for (let l of ol_layers) {
        //     map.removeLayer(l);
        //     l.dispose();
        // }
        ol_layers.forEach((l) => {
            map.addLayer(l);
        });
        update_scales(ol_layers);
    }

    map.update_layers = function (layers_list) {
        update_deck_layers(layers_list);
        update_ol_layers(layers_list);
    };

    map.update_data = function (data) {
        let deserialized_data = {};
        for (let k in data) {
            deserialized_data[k] = unserialize_data(data[k]);
        }
        map.data = deserialized_data;
    };

    map.update_data(data);
    map.update_layers(layers);
    el.map = map;
    return map;
}

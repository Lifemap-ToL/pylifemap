import { LineLayer } from "@deck.gl/layers";
import { guidGenerator, DEFAULT_NUM_SCHEME } from "../utils";
import * as d3 from "d3";
import * as Plot from "@observablehq/plot";

export function layer_lines(map, data, options = {}) {
    let {
        id = null,
        x_col0 = "pylifemap_x0",
        y_col0 = "pylifemap_y0",
        x_col1 = "pylifemap_x1",
        y_col1 = "pylifemap_y1",
        width = null,
        width_col = null,
        color_col = null,
        label = null,
        scheme = null,
        opacity = 0.6,
        popup = false,
        scale_extent = null,
    } = options;

    let scales = [];
    let popup_obj = map.popup;

    id = `lifemap-ol-${id ?? guidGenerator()}`;

    // Width column
    let get_width, width_scale;
    if (width_col !== null) {
        const max_value =
            scale_extent !== null
                ? scale_extent[1]
                : d3.max(data, (d) => Number(d[width_col]));
        const min_value =
            scale_extent !== null
                ? scale_extent[0]
                : d3.min(data, (d) => Number(d[width_col]));
        get_width = (d) => (Number(d[width_col]) - min_value) / max_value;
        width_scale = width ?? 20;
    } else {
        get_width = 1;
        width_scale = width ?? 4;
    }

    // Color column
    let get_color;
    if (color_col !== null) {
        const max_value =
            scale_extent !== null
                ? scale_extent[1]
                : d3.max(data, (d) => Number(d[color_col]));
        const min_value =
            scale_extent !== null
                ? scale_extent[0]
                : d3.min(data, (d) => Number(d[color_col]));
        scheme = scheme ?? DEFAULT_NUM_SCHEME;
        const scale = {
            color: {
                type: "linear",
                scheme: scheme,
                domain: [min_value, max_value],
            },
            className: "lifemap-ol-lin-legend",
            label: label ?? color_col,
        };
        scales.push(scale);
        get_color = (d) => {
            const col = d3.color(Plot.scale(scale).apply(Number(d[color_col]))).rgb();
            return [col["r"], col["g"], col["b"]];
        };
    } else {
        get_color = [200, 0, 0];
    }

    // Popup
    // TODO : doesn't work
    if (popup) {
        onclick = ({ object }) => {
            if (object === undefined) return;
            let content = `<p><strong>TaxId:</strong> ${object.taxid}<br>`;
            content +=
                width_col !== null
                    ? `<strong>${width_col}:</strong> ${object[width_col]}<br>`
                    : "";
            content +=
                fill_col !== null
                    ? `<strong>${color_col}:</strong> ${object[color_col]}<br>`
                    : "";
            content += "</p>";
            popup_obj = popup_obj.setLatLng([object.lat, object.lon]).setContent(content);
            map.openPopup(popup_obj);
        };
    }

    // Layer definition
    const layer = new LineLayer({
        id: id,
        data: data,
        widthUnits: "pixels",
        widthScale: width_scale,
        widthMinPixels: 3,
        getSourcePosition: (d) => [d[x_col0], d[y_col0], 0],
        getTargetPosition: (d) => [d[x_col1], d[y_col1], 0],
        getWidth: get_width,
        getColor: get_color,
        opacity: opacity,
        pickable: popup,
        autoHighlight: false,
    });

    layer.lifemap_ol_id = id;
    layer.lifemap_ol_scales = scales;
    return layer;
}

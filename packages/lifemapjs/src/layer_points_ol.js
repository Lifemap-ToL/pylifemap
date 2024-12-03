import { guidGenerator } from "./utils";

import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import Vector from "ol/source/Vector.js";
import WebGLPointsLayer from "ol/layer/WebGLPoints.js";
import { fromLonLat } from "ol/proj.js";

import * as d3 from "d3";
import * as Plot from "@observablehq/plot";

export function layer_points_ol(map, data, options = {}) {
    let {
        id = null,
        x_col = "pylifemap_x",
        y_col = "pylifemap_y",
        radius = null,
        radius_col = null,
        fill_col = null,
        fill_col_cat = null,
        scheme = null,
        opacity = 0.1,
        popup = false,
    } = options;

    let scales = [];
    let popup_obj = map.popup;
    id = `lifemap-ol-${id ?? guidGenerator()}`;

    const n_features = data.length;
    const features = new Array(n_features);

    for (let i = 0; i < n_features; i++) {
        let line = data[i];
        const coordinates = fromLonLat([line[x_col], line[y_col]]);
        features[i] = new Feature({
            geometry: new Point(coordinates),
        });
    }
    const source = new Vector({
        features: features,
    });

    const style = {
        "circle-radius": radius,
        "circle-fill-color": "#FF0000",
        "circle-opacity": opacity,
    };

    // Layer definition
    const layer = new WebGLPointsLayer({
        source: source,
        style: style,
        disableHitDetection: true,
    });

    layer.lifemap_ol_id = id;
    layer.lifemap_ol_layer = true;
    layer.lifemap_ol_scales = scales;
    return layer;
}

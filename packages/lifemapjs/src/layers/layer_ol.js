// OL
import Map from "ol/Map";
import { Tile as TileLayer } from "ol/layer";
import { WebGLTile } from "ol/layer";
import View from "ol/View";
import XYZ from "ol/source/XYZ";
import Overlay from "ol/Overlay.js";
import { DragPan, MouseWheelZoom, defaults } from "ol/interaction.js";
import { getBottomLeft, getTopRight } from "ol/extent.js";
import { fromLonLat, toLonLat } from "ol/proj";
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import { Vector } from "ol/source.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import { MVT } from "ol/format";

import { Style, Circle, Fill, Stroke } from "ol/style.js";
import Text from "ol/style/Text.js";
import {
    createRankLabelStyleFunction,
    createRankPolygonStyleFunction,
    createBranchStyle,
} from "../styles/ol_styles";

export function layer_ol(el, deck_layer, options) {
    const { zoom = 5, minZoom = 4, maxZoom = 42 } = options;
    const lang = "en";

    const view = new View({
        center: fromLonLat([0, -4.226497]),
        zoom: zoom,
        minZoom: minZoom,
        maxZoom: maxZoom,
        enableRotation: false,
        constrainResolution: false,
        smoothResolutionConstraint: false,
    });

    const branches_layer = new VectorTileLayer({
        source: new VectorTileSource({
            maxZoom: 42,
            format: new MVT(),
            url: "https://lifemap-back.univ-lyon1.fr/vector_tiles/xyz/branches/{z}/{x}/{y}.pbf",
        }),
        style: createBranchStyle(),
        declutter: true,
        renderMode: "vector",
        renderBuffer: 256,
    });

    const rank_label_layers = new VectorTileLayer({
        source: new VectorTileSource({
            maxZoom: 42,
            format: new MVT(),
            url: "https://lifemap-back.univ-lyon1.fr/vector_tiles/xyz/ranks/{z}/{x}/{y}.pbf",
        }),
        style: createRankLabelStyleFunction(lang),
        declutter: true,
        renderMode: "vector",
        renderBuffer: 256,
    });

    const polygons_layer = new VectorTileLayer({
        background: "#000",
        source: new VectorTileSource({
            maxZoom: 42,
            format: new MVT(),
            url: "https://lifemap-back.univ-lyon1.fr/vector_tiles/xyz/polygons/{z}/{x}/{y}.pbf",
        }),
        style: createRankPolygonStyleFunction(view),
        declutter: false,
        renderMode: "vector",
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        renderBuffer: 256,
        preload: Infinity,
    });

    const API_URL = "https://lifemap-back.univ-lyon1.fr/solr";
    const TEXT_COLOR = "rgba(255, 255, 255, 1)";
    const TEXT_STROKE_COLOR = "rgba(0, 0, 0, 1)";

    const label_style_function = (feature) => {
        const label_style = new Style({
            // image: new Circle({
            //     radius: 4,
            //     fill: new Fill({ color: "rgba(255, 255, 255, 1)" }),
            //     stroke: new Stroke({
            //         width: 1,
            //         color: "rgba(0, 0, 0, 1)",
            //     }),
            //     declutterMode: "none",
            //     zIndex: 0,
            // }),
            text: create_taxon_text(
                feature.get("sci_name"),
                feature.get("label_font_size"),
                feature.get("common_name")
            ),
        });

        return label_style;
    };

    const labels_source = new Vector();
    const labels_layer = new VectorLayer({
        source: labels_source,
        style: label_style_function,
        declutter: true,
        zIndex: 5,
    });

    function create_taxon_text(taxonName, taxonNameLabelFontSize, taxonCommonName) {
        const taxonNameLabelFont = `${taxonNameLabelFontSize}px Segoe UI, Helvetica, sans-serif`;
        const taxonCommonNameLabelFontSize = taxonNameLabelFontSize - 8;
        const taxonCommonNameLabelFont = `${taxonCommonNameLabelFontSize}px Segoe UI, Helvetica, sans-serif`;
        const nameText = [taxonName, taxonNameLabelFont];
        const commonNameText =
            taxonCommonName && taxonCommonNameLabelFontSize > 10
                ? ["\n", taxonNameLabelFont, taxonCommonName, taxonCommonNameLabelFont]
                : [];
        const text = [...nameText, ...commonNameText];

        const text_style = new Text({
            fill: new Fill({ color: TEXT_COLOR }),
            stroke: new Stroke({ width: 2, color: TEXT_STROKE_COLOR }),
            text: text,
            offsetY: 10,
            textBaseline: "top",
        });

        return text_style;
    }

    function to_taxon(doc, zoom) {
        let taxon = {};
        taxon["sci_name"] = doc["sci_name"][0];
        taxon["common_name"] = doc["common_name"] ? doc["common_name"][0] : undefined;
        taxon["geometry"] = new Point(fromLonLat([doc["lon"], doc["lat"]]));
        taxon["zoom"] = doc["zoom"][0];
        taxon["label_font_size"] = 16 + (zoom - doc["zoom"][0]) * 3;
        return new Feature(taxon);
    }

    function list_for_extent(zoom, extent) {
        zoom = Math.round(zoom);
        const url = `${API_URL}/taxo/select?q=*:*&fq=zoom:[0 TO ${zoom}]&fq=lat:[${extent[1]} TO ${extent[3]}]&fq=lon:[${extent[0]} TO ${extent[2]}]&wt=json&rows=1000`;
        const list_taxa = () =>
            fetch(url)
                .then((response) => response.json())
                .then((response) => response.response.docs.map((d) => to_taxon(d, zoom)))
                .catch(function (ex) {
                    console.warn("parsing failed", ex);
                });

        return list_taxa();
    }

    async function on_move_end(ev) {
        const map = ev.map;
        let extent = map.getView().calculateExtent();
        extent = [...toLonLat(getBottomLeft(extent)), ...toLonLat(getTopRight(extent))];
        const zoom = map.getView().getZoom();
        let labels = await list_for_extent(zoom + 3, extent);
        labels_source.clear();
        labels_source.addFeatures(labels);
        map.render();
    }

    let map = new Map({
        interactions: defaults({
            dragZoom: false,
            dragPan: false,
            mouseWheelZoom: false,
        }).extend([
            new DragPan({ duration: 0, kinetic: false }),
            new MouseWheelZoom({
                onFocusOnly: false,
                constrainResolution: false,
                maxDelta: 1,
                duration: 300,
                timeout: 100,
            }),
        ]),
        overlays: [],
        target: el,
        view,
        layers: [
            polygons_layer,
            //rank_label_layers,
            branches_layer,
            deck_layer,
            labels_layer,
        ],
    });

    map.on("moveend", on_move_end);

    // Popup object
    const popup = create_popup();
    const popup_overlay = new Overlay({
        element: popup,
        autoPan: {
            animation: {
                duration: 250,
            },
        },
    });

    map.popup = popup;
    map.popup_overlay = popup_overlay;
    map.addOverlay(popup_overlay);

    map.dispose_popup = function () {
        map.popup_overlay.setPosition(undefined);
        map.popup.closer.blur();
        return false;
    };

    map.show_popup = function (coordinates, content, offset = [0, 0]) {
        map.dispose_popup();
        map.popup.content.innerHTML = content;
        map.popup_overlay.setPosition(fromLonLat(coordinates));
        map.popup_overlay.setOffset(offset);
    };

    map.popup.closer.onclick = map.dispose_popup;

    function on_click() {
        map.dispose_popup();
    }

    map.on("click", on_click);

    return map;
}

function create_popup() {
    const container = document.createElement("div");
    container.id = "lifemap-popup";
    const content = document.createElement("div");
    content.id = "lifemap-popup-content";
    container.appendChild(content);
    const closer = document.createElement("div");
    closer.id = "lifemap-popup-closer";
    closer.innerHTML = "<a href='#'>✕</a>";
    container.appendChild(closer);

    container.content = content;
    container.closer = closer;

    return container;
}

import VectorTileLayer from "ol/layer/VectorTile"
import VectorTileSource from "ol/source/VectorTile"

import { Stroke, Fill, Style, Text } from "ol/style"
import { MVT } from "ol/format"
import { LIFEMAP_BACK_URL } from "../utils"

export function layer_tiles(map, lang) {
    let view = map.getView()
    const theme = map.theme

    function createBranchStyle() {
        return new Style({
            stroke: new Stroke({
                color: theme.branches_stroke_color,
                width: theme.branches_width,
            }),
            zIndex: 6,
        })
    }

    function createRankLabelStyleFunction(lang) {
        return function (feature) {
            const convex = feature.get("convex")
            // TODO: fix this ugly hack to avoid rank repeat
            const label = "            " + feature.get(`rank_${lang}`) + "              "
            const text_color = theme.rank_text_color[feature.get("ref")]

            return new Style({
                text: new Text({
                    font: 'bold 11px "Open Sans", "Roboto", "Arial Unicode MS", "Arial", "sans-serif"',
                    placement: "line",
                    overflow: true,
                    repeat: 2000,
                    padding: [0, 2000, 0, 2000],
                    textBaseline: convex < 0 ? "top" : "bottom",
                    offsetY: convex < 0 ? -15 : 15,
                    fill: new Fill({
                        color: text_color,
                    }),
                    text: label,
                }),
            })
        }
    }

    function createRankPolygonStyleFunction(view) {
        return function (feature) {
            const themeColor = theme.polygon_fill_color[feature.get("ref")]
            const currentZoom = view.getZoom()
            const zoomLevel = feature.get("zoomview")
            const opacityFactor =
                currentZoom !== undefined
                    ? 1 - Math.abs(currentZoom - zoomLevel - 1) / 5
                    : 1
            //const opacityFactor = 1;
            const fillColor = [
                themeColor[0],
                themeColor[1],
                themeColor[2],
                themeColor[3] * opacityFactor,
            ]
            return new Style({
                fill: new Fill({ color: fillColor }),
                zIndex: 1,
            })
        }
    }

    function createCompositeStyleFunction(view, lang) {
        const poly_style = createRankPolygonStyleFunction(view)
        const branch_style = createBranchStyle()
        const rank_style = createRankLabelStyleFunction(lang)

        return function (feature) {
            const type = feature.getProperties()["layer"]
            return type == "poly-layer"
                ? poly_style(feature)
                : type == "branches-layer"
                  ? branch_style
                  : rank_style(feature)
        }
    }

    const id = "base-layer"
    const layer = new VectorTileLayer({
        id: id,
        background: theme.background_color,
        source: new VectorTileSource({
            maxZoom: 42,
            format: new MVT(),
            url: `${LIFEMAP_BACK_URL}/vector_tiles/xyz/composite/{z}/{x}/{y}.pbf`,
        }),
        style: createCompositeStyleFunction(view, lang),
        declutter: id,
        renderMode: "vector",
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        renderBuffer: 256,
        preload: Infinity,
    })

    return layer
}

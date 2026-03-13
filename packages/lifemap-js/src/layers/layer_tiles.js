import VectorTileLayer from "ol/layer/VectorTile"
import VectorTileSource from "ol/source/VectorTile"

import { Stroke, Fill, Style, Text } from "ol/style"
import { MVT } from "ol/format"
import { LIFEMAP_BACK_URL } from "../utils"
import { THEMES } from "../elements/themes"

export class TilesLayer {
    constructor(base_map, theme, lang) {
        this.view = base_map.map.getView()
        this.id = "tiles-layer"
        this.lang = lang
        this.theme = THEMES[theme]
        this.layer = this.create_layer()
    }

    create_layer() {
        const source = new VectorTileSource({
            maxZoom: 42,
            format: new MVT(),
            url: `${LIFEMAP_BACK_URL}/vector_tiles/xyz/composite/{z}/{x}/{y}.pbf`,
        })

        const layer = new VectorTileLayer({
            id: this.id,
            background: this.theme.background_color,
            source: source,
            style: this.create_composite_style_fn(),
            declutter: this.id,
            renderMode: "vector",
            updateWhileAnimating: true,
            updateWhileInteracting: true,
            renderBuffer: 256,
            preload: Infinity,
        })

        return layer
    }

    create_composite_style_fn() {
        const poly_style = this.create_rank_polygon_style_fn()
        const branch_style = this.create_branch_style()
        const rank_style = this.create_rank_label_style_fn()

        return (feature) => {
            const type = feature.getProperties()["layer"]
            return type == "poly-layer"
                ? poly_style(feature)
                : type == "branches-layer"
                  ? branch_style
                  : rank_style(feature)
        }
    }

    create_rank_label_style_fn() {
        return (feature) => {
            const convex = feature.get("convex")
            // TODO: fix this ugly hack to avoid rank repeat
            const label =
                "            " + feature.get(`rank_${this.lang}`) + "              "
            const text_color = this.theme.rank_text_color[feature.get("ref")]

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

    create_rank_polygon_style_fn(view) {
        return (feature) => {
            const themeColor = this.theme.polygon_fill_color[feature.get("ref")]
            const currentZoom = this.view.getZoom()
            const zoomLevel = feature.get("zoomview")
            const opacityFactor =
                currentZoom !== undefined
                    ? 1 - Math.abs(currentZoom - zoomLevel - 1) / 5
                    : 1
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

    create_branch_style() {
        return new Style({
            stroke: new Stroke({
                color: this.theme.branches_stroke_color,
                width: this.theme.branches_width,
            }),
            zIndex: 6,
        })
    }
}

import { fromLonLat, transformExtent } from "ol/proj"
import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import { Vector } from "ol/source.js"
import VectorLayer from "ol/layer/Vector.js"
import { Style, Fill, Stroke } from "ol/style.js"
import Text from "ol/style/Text.js"
import { LIFEMAP_BACK_URL } from "../utils"
import { THEMES } from "../elements/themes"

const SOLR_API_URL = `${LIFEMAP_BACK_URL}/solr`

export class LabelsLayer {
    constructor(base_map, theme) {
        this.map = base_map
        this.theme = THEMES[theme]
        this.id = "labels-layer"

        this.source = new Vector({ useSpatialIndex: false })
        this.layer = this.create_layer()

        this.map.add_moveend_callback((ev) => this.on_move_end(ev))
    }

    create_layer() {
        return new VectorLayer({
            id: this.id,
            source: this.source,
            style: this.get_style(),
            declutter: this.id,
            zIndex: 5,
        })
    }

    get_style() {
        return (feature) =>
            new Style({
                text: this.create_taxon_text({
                    taxon_name: feature.get("sci_name"),
                    taxon_name_font_size: feature.get("label_font_size"),
                    taxon_common_name: feature.get("common_name"),
                    text_color: this.theme.label_text_color,
                    text_stroke: this.theme.label_stroke_color,
                    text_stroke_width: this.theme.label_stroke_width,
                }),
            })
    }

    async on_move_end(ev) {
        const map = ev.map
        const extent = transformExtent(
            map.getView().calculateExtent(),
            "EPSG:3857",
            "EPSG:4326"
        )
        const zoom = Math.round(map.getView().getZoom())
        let labels = await this.list_for_extent(zoom + 4, extent)
        this.source.clear()
        this.source.addFeatures(labels)
        map.render()
    }

    create_taxon_text(options) {
        let {
            taxon_name,
            taxon_name_font_size,
            taxon_common_name,
            text_color,
            text_stroke,
            text_stroke_width,
        } = options
        const taxon_name_label_font = `${taxon_name_font_size}px Segoe UI, Helvetica, sans-serif`
        const taxon_common_name_font_size = taxon_name_font_size - 8
        const taxon_common_name_font = `${taxon_common_name_font_size}px Segoe UI, Helvetica, sans-serif`
        const name_text = [taxon_name, taxon_name_label_font]
        const common_name_text =
            taxon_common_name && taxon_common_name_font_size > 10
                ? ["\n", taxon_name_label_font, taxon_common_name, taxon_common_name_font]
                : []
        const text = [...name_text, ...common_name_text]

        const text_style = new Text({
            fill: new Fill({ color: text_color }),
            stroke: new Stroke({ width: text_stroke_width, color: text_stroke }),
            text: text,
            offsetY: 10,
            textBaseline: "top",
        })

        return text_style
    }

    async list_for_extent(zoom, extent) {
        const to_taxon = (doc, zoom) => {
            let taxon = {}
            taxon["sci_name"] = doc["sci_name"][0]
            taxon["common_name"] = doc["common_name"] ? doc["common_name"][0] : undefined
            taxon["geometry"] = new Point(fromLonLat([doc["lon"], doc["lat"]]))
            taxon["zoom"] = doc["zoom"][0]
            taxon["label_font_size"] = 16 + (zoom - doc["zoom"][0]) * 3
            return new Feature(taxon)
        }

        const url = `${SOLR_API_URL}/taxo/select?q=*:*&fq=zoom:[0 TO ${zoom}]&fq=lat:[${extent[1]} TO ${extent[3]}]&fq=lon:[${extent[0]} TO ${extent[2]}]&wt=json&rows=1000`
        const list_taxa = () =>
            fetch(url)
                .then((response) => response.json())
                .then((response) => response.response.docs.map((d) => to_taxon(d, zoom)))
                .catch(function (ex) {
                    console.warn("parsing failed", ex)
                })

        return list_taxa()
    }
}

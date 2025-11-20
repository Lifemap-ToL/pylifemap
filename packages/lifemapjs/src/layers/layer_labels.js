import { getBottomLeft, getTopRight } from "ol/extent.js"
import { fromLonLat, toLonLat, transformExtent } from "ol/proj"
import Feature from "ol/Feature.js"
import Point from "ol/geom/Point.js"
import { Vector } from "ol/source.js"
import VectorLayer from "ol/layer/Vector.js"
import { Style, Fill, Stroke } from "ol/style.js"
import Text from "ol/style/Text.js"
import { LIFEMAP_BACK_URL } from "../utils"

const SOLR_API_URL = `${LIFEMAP_BACK_URL}/solr`

function create_taxon_text(options) {
    let {
        taxonName,
        taxonNameLabelFontSize,
        taxonCommonName,
        text_color,
        text_stroke,
        text_stroke_width,
    } = options
    const taxonNameLabelFont = `${taxonNameLabelFontSize}px Segoe UI, Helvetica, sans-serif`
    const taxonCommonNameLabelFontSize = taxonNameLabelFontSize - 8
    const taxonCommonNameLabelFont = `${taxonCommonNameLabelFontSize}px Segoe UI, Helvetica, sans-serif`
    const nameText = [taxonName, taxonNameLabelFont]
    const commonNameText =
        taxonCommonName && taxonCommonNameLabelFontSize > 10
            ? ["\n", taxonNameLabelFont, taxonCommonName, taxonCommonNameLabelFont]
            : []
    const text = [...nameText, ...commonNameText]

    const text_style = new Text({
        fill: new Fill({ color: text_color }),
        stroke: new Stroke({ width: text_stroke_width, color: text_stroke }),
        text: text,
        offsetY: 10,
        textBaseline: "top",
    })

    return text_style
}

function to_taxon(doc, zoom) {
    let taxon = {}
    taxon["sci_name"] = doc["sci_name"][0]
    taxon["common_name"] = doc["common_name"] ? doc["common_name"][0] : undefined
    taxon["geometry"] = new Point(fromLonLat([doc["lon"], doc["lat"]]))
    taxon["zoom"] = doc["zoom"][0]
    taxon["label_font_size"] = 16 + (zoom - doc["zoom"][0]) * 3
    return new Feature(taxon)
}

function list_for_extent(zoom, extent) {
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

export function layer_labels(map) {
    const id = "labels-layer"
    const label_style_function = (feature) => {
        const label_style = new Style({
            text: create_taxon_text({
                taxonName: feature.get("sci_name"),
                taxonNameLabelFontSize: feature.get("label_font_size"),
                taxonCommonName: feature.get("common_name"),
                text_color: map.theme.label_text_color,
                text_stroke: map.theme.label_stroke_color,
                text_stroke_width: map.theme.label_stroke_width,
            }),
        })

        return label_style
    }

    const labels_source = new Vector()
    const labels_layer = new VectorLayer({
        id: id,
        source: labels_source,
        style: label_style_function,
        declutter: id,
        zIndex: 5,
    })

    async function on_move_end(ev) {
        const map = ev.map
        const extent = transformExtent(
            map.getView().calculateExtent(),
            "EPSG:3857",
            "EPSG:4326"
        )
        //extent = [...toLonLat(getBottomLeft(extent)), ...toLonLat(getTopRight(extent))]
        const zoom = Math.round(map.getView().getZoom())
        let labels = await list_for_extent(zoom + 4, extent)
        labels_source.clear()
        labels_source.addFeatures(labels)
        map.render()
    }

    map.on("moveend", on_move_end)

    return labels_layer
}

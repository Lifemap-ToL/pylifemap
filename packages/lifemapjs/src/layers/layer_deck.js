import { Deck } from "@deck.gl/core"
import { Layer } from "ol/layer"
import { toLonLat } from "ol/proj"
import { DEFAULT_LON, DEFAULT_LAT } from "../utils"

export function layer_deck(el, zoom) {
    // Create deck.gl layer
    const deck = new Deck({
        initialViewState: { longitude: DEFAULT_LON, latitude: DEFAULT_LAT, zoom: zoom },
        controller: false,
        //useDevicePixels: false,
        parent: el.querySelector(".ol-viewport"),
        style: { pointerEvents: "none", "z-index": 1 },
        layers: [],
    })

    const deck_layer = new Layer({
        render({ size, viewState }) {
            const [width, height] = size
            const [longitude, latitude] = toLonLat(viewState.center)
            const zoom = viewState.zoom - 1
            const bearing = 0
            const deckViewState = { bearing, longitude, latitude, zoom }
            deck.setProps({ width, height, viewState: deckViewState })
            deck.redraw()
        },
    })

    return { deck_layer: deck_layer, deck: deck }
}

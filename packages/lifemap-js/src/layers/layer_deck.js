//import { Deck } from "@deck.gl/core"
import { Layer } from "ol/layer"
import { toLonLat } from "ol/proj"
import { DEFAULT_LON, DEFAULT_LAT } from "../utils"

export class DeckLayer {
    constructor(el, zoom) {
        this.el = el
        this.zoom = zoom
        this.deck = null
        this.deck_layer = null
    }

    async init() {
        const deck_core = await import("@deck.gl/core")

        this.deck = new deck_core.Deck({
            initialViewState: {
                longitude: DEFAULT_LON,
                latitude: DEFAULT_LAT,
                zoom: this.zoom,
            },
            controller: false,
            //useDevicePixels: false,
            parent: this.el.querySelector(".ol-viewport"),
            style: { pointerEvents: "none", "z-index": 1 },
            layers: [],
        })

        this.deck_layer = new Layer({
            render: ({ size, viewState }) => {
                const [width, height] = size
                const [longitude, latitude] = toLonLat(viewState.center)
                const zoom = viewState.zoom - 1
                const bearing = 0
                const deckViewState = { bearing, longitude, latitude, zoom }
                this.deck.setProps({ width, height, viewState: deckViewState })
                this.deck.redraw()
            },
        })
    }
}

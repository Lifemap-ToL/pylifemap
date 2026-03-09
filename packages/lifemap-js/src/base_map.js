// OL
import Map from "ol/Map"
import View from "ol/View"
import { Popup } from "./elements/popup"
import { DragPan, MouseWheelZoom, defaults } from "ol/interaction.js"
import { fromLonLat, transformExtent } from "ol/proj"
import { get_controls } from "./elements/controls"
import { LazySpinner } from "./elements/lazy_spinner"
import { get_taxid_coords } from "./data/api"
import { LegendControl } from "./elements/controls"
import { extend, getBottomLeft, getTopRight } from "ol/extent"

import * as Plot from "@observablehq/plot"

import { DEFAULT_LON, DEFAULT_LAT, DEFAULT_ZOOM, MAP_EXTENT } from "./utils"

export class BaseMap {
    constructor(el, options) {
        const {
            zoom = undefined,
            minZoom = 4,
            maxZoom = 42,
            controls_list = [],
            center = "default",
            legend_width = undefined,
        } = options

        Object.assign(this, {
            zoom,
            minZoom,
            maxZoom,
            controls_list,
            center,
            legend_width,
        })

        this.el = el
        this.map = this.create_map()
        this.default_view = null

        // Popup
        this.popup = this.create_popup()

        // Lazy loading spinner
        this.lazy_spinner = new LazySpinner(this.el)

        // Legend
        this.legend = new LegendControl()
        this.legend_width = legend_width
    }

    create_map() {
        const view = new View({
            center: fromLonLat([DEFAULT_LON, DEFAULT_LAT]),
            extent: transformExtent(MAP_EXTENT, "EPSG:4326", "EPSG:3857"),
            zoom: this.zoom ?? DEFAULT_ZOOM,
            minZoom: this.minZoom,
            maxZoom: this.maxZoom,
            enableRotation: false,
            constrainResolution: false,
            smoothResolutionConstraint: false,
        })

        const controls = get_controls(this.controls_list, this)

        return new Map({
            controls: controls,
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
            target: this.el,
            view,
            layers: [],
        })
    }

    create_popup() {
        const popup = new Popup()
        this.map.addOverlay(popup.overlay)
        this.map.on("click", () => popup.dispose())
        return popup
    }

    add_moveend_callback(fn) {
        this.map.on("moveend", fn)
    }

    add_hover_event(options) {
        let { layer_id, selected_feature } = options
        // /!\ Use arrow function here so that this is captured
        this.map.on("pointermove", (ev) => {
            if (selected_feature !== null) {
                selected_feature.set("hover", 0)
                selected_feature = null
            }

            this.map.forEachFeatureAtPixel(
                ev.pixel,
                function (feature) {
                    feature.set("hover", 1)
                    selected_feature = feature
                    return true
                },
                { layerFilter: (d) => d.id == layer_id }
            )
        })
    }

    add_popup_event(options) {
        let { layer_id, coordinates_fn, content_fn, offset = [0, -5] } = options
        // /!\ Use arrow function here so that this is captured
        this.map.on("click", async (ev) => {
            const feature = this.map.forEachFeatureAtPixel(
                ev.pixel,
                (feature) => feature,
                {
                    layerFilter: (d) => d.id == layer_id,
                }
            )
            if (!feature) {
                return
            }
            const content = await content_fn(feature)
            const coordinates =
                coordinates_fn !== null ? coordinates_fn(feature) : ev.coordinate
            this.popup.show(coordinates, content, offset)
        })
    }

    update_legend(scales) {
        this.map.removeControl(this.legend)
        if (scales == 0) {
            return
        }

        let legend_container = document.createElement("div")
        if (this.legend_width) {
            legend_container.style.width = this.legend_width
        }
        // Add legends
        for (let scale of Object.values(scales)) {
            if (scale.color.type == "categorical") {
                const legend_label = document.createElement("div")
                legend_label.classList.add("legend-title")
                legend_label.innerHTML = scale.label
                legend_container.append(legend_label)
            }
            if (scale.color.type == "linear") {
                if (
                    (Math.min(...scale.color.domain) <= -1e9) |
                    (Math.max(...scale.color.domain) >= 1e9)
                ) {
                    scale.color.tickFormat = (d) => d.toExponential(1)
                }
            }
            legend_container.append(Plot.legend(scale))
        }
        // Remove any previous legend in case of update
        this.legend.element.innerHTML = ""
        this.legend.element.appendChild(legend_container)
        this.map.addControl(this.legend)
    }

    // Compute start and default view
    async compute_default_view(options) {
        let { ol_layers = undefined } = options

        // Default
        const default_center = fromLonLat([DEFAULT_LON, DEFAULT_LAT])
        const default_zoom = this.zoom ?? DEFAULT_ZOOM
        this.default_view = {
            type: "center-zoom",
            center: default_center,
            zoom: default_zoom,
        }

        // center = "auto" -> Adjust view to data
        if (this.center == "auto" && ol_layers !== undefined && ol_layers.length > 0) {
            let global_extent = null
            for (let layer of ol_layers) {
                let current_extent = layer.getSource().getExtent()
                if (global_extent === null) {
                    global_extent = current_extent
                } else {
                    global_extent = extend(global_extent, current_extent)
                }
            }

            if (
                JSON.stringify(global_extent) !=
                JSON.stringify([Infinity, Infinity, -Infinity, -Infinity])
            ) {
                this.default_view = { type: "extent", extent: global_extent }
            }
        }

        // Center view on taxid
        else if (Number.isFinite(this.center)) {
            const result = await get_taxid_coords(this.center)
            if (result === undefined) {
                console.warn(`taxid ${this.center} not found in Lifemap taxids.`)
            } else {
                this.default_view = {
                    type: "center-zoom",
                    center: fromLonLat([result["lon"], result["lat"]]),
                    zoom: this.zoom ?? result["zoom"] - 3,
                }
            }
        }
    }

    // Reset view to computed default view
    reset_view(options) {
        let { animate = false } = options
        if (this.default_view === null) {
            return
        }

        const duration = animate ? 500 : 0
        let view = this.map.getView()

        if (this.default_view.type == "extent") {
            view.fit(this.default_view.extent, {
                padding: [50, 150, 50, 50],
                duration: duration,
            })
        }
        if (this.default_view.type == "center-zoom") {
            view.animate({
                center: this.default_view.center,
                zoom: this.default_view.zoom,
                duration: duration,
            })
        }
    }

    // Initialize zoom after layers creation
    // OpenLayers layers are passed as argument to use if center is "auto"
    async init_view(options) {
        let { ol_layers = undefined } = options
        await this.compute_default_view({ ol_layers: ol_layers })
        this.reset_view({ animate: false })
    }

    // Setup data lazy loading from a data source and an Ope
    setup_lazy_loading(options) {
        let { data, source, create_feature_fn, lazy_zoom, type } = options

        // Points filtering function
        const points_filter_fn = (d, xmin, xmax, ymin, ymax, zoom) =>
            d["pylifemap_zoom"] <= zoom &&
            d["pylifemap_x"] >= xmin &&
            d["pylifemap_x"] <= xmax &&
            d["pylifemap_y"] >= ymin &&
            d["pylifemap_y"] <= ymax
        // Lines filtering function
        const lines_filter_fn = (d, xmin, xmax, ymin, ymax, zoom) =>
            d["pylifemap_zoom"] <= zoom &&
            ((d["pylifemap_x"] >= xmin &&
                d["pylifemap_x"] <= xmax &&
                d["pylifemap_y"] >= ymin &&
                d["pylifemap_y"] <= ymax) ||
                (d["pylifemap_parent_x"] >= xmin &&
                    d["pylifemap_parent_x"] <= xmax &&
                    d["pylifemap_parent_y"] >= ymin &&
                    d["pylifemap_parent_y"] <= ymax))
        // Arcs filtering function
        const arcs_filter_fn = (d, xmin, xmax, ymin, ymax, zoom) =>
            d["pylifemap_zoom"] <= zoom &&
            ((d["pylifemap_x"] >= xmin &&
                d["pylifemap_x"] <= xmax &&
                d["pylifemap_y"] >= ymin &&
                d["pylifemap_y"] <= ymax) ||
                (d["pylifemap_dest_x"] >= xmin &&
                    d["pylifemap_dest_x"] <= xmax &&
                    d["pylifemap_dest_y"] >= ymin &&
                    d["pylifemap_dest_y"] <= ymax))

        const filter_fn =
            type == "lines"
                ? lines_filter_fn
                : type == "arcs"
                  ? arcs_filter_fn
                  : points_filter_fn

        const display_for_extent = () => {
            const current_zoom = this.map.getView().getZoom()
            let extent = this.map.getView().calculateExtent()
            let [xmin, ymin, xmax, ymax] = [
                ...getBottomLeft(extent),
                ...getTopRight(extent),
            ]
            const xrange = xmax - xmin
            const yrange = ymax - ymin
            xmin = xmin - xrange * 0.05
            ymin = ymin - yrange * 0.05
            xmax = xmax + xrange * 0.05
            ymax = ymax + yrange * 0.05
            const zoom = lazy_zoom > 0 ? current_zoom + lazy_zoom : Infinity
            const extent_features = data
                .filter((d) => filter_fn(d, xmin, xmax, ymin, ymax, zoom))
                .map(create_feature_fn)
            source.clear()
            source.addFeatures(extent_features)

            this.map.render()
        }

        display_for_extent()

        // Refresh features after move or zoom
        this.add_moveend_callback((ev) => {
            this.lazy_spinner.show()
            requestAnimationFrame(() => {
                try {
                    display_for_extent()
                } finally {
                    this.lazy_spinner.hide()
                }
            })
        })
    }
}

import { get_taxid_coords, fetch_suggestions } from "../../data/api"
import { flyTo } from "../../utils"
import { fromLonLat } from "ol/proj"
import Control from "ol/control/Control.js"

export class TaxaSearchControl extends Control {
    constructor(options = {}) {
        const { top, base_map } = options

        const container = document.createElement("div")
        container.className =
            "lifemap-search pylifemap-control ol-unselectable ol-control"
        container.style.top = `${top}em`

        super({
            element: container,
            target: options.target,
        })
        this.base_map = base_map

        const button = document.createElement("button")
        button.setAttribute("title", "Search")
        button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Search taxa</title><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" /></svg>'
        container.appendChild(button)

        button.addEventListener("click", () => this.handle_click(), false)

        this.container = container
        this.button = button
        this.dialog = new SearchDialog(this.container, this.button, this.base_map)
    }

    handle_click() {
        if (this.dialog.dialog.open) {
            this.dialog.hide()
        } else {
            if ("settings" in this.base_map.controls) {
                this.base_map.controls.settings.dialog.hide()
            }
            if ("export" in this.base_map.controls) {
                this.base_map.controls.export.dialog.hide()
            }
            this.dialog.show()
        }
    }
}

class SearchDialog {
    constructor(el, button, base_map) {
        // Dialog
        const dialog = document.createElement("dialog")

        // Search input field
        const input = document.createElement("input")
        input.type = "search"
        input.placeholder = "Taxa name or id..."
        input.name = "pylifemap-search"
        input.autocomplete = "off"
        dialog.appendChild(input)
        dialog.addEventListener("beforetoggle", (event) => {
            if (event.newState === "open") {
                input.focus()
                input.select()
            }
        })

        input.addEventListener("change", this.input_validated.bind(this))
        input.addEventListener("input", this.input_changed.bind(this))
        input.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.hide()
            }
        })

        // Error message
        const error = document.createElement("div")
        error.classList.add("error")
        dialog.appendChild(error)

        // Suggestions list
        const suggestions = document.createElement("div")
        suggestions.classList.add("suggestions")
        dialog.appendChild(suggestions)

        el.appendChild(dialog)

        this.button = button
        this.dialog = dialog
        this.input = input
        this.error = error
        this.suggestions = suggestions
        this.base_map = base_map
    }

    show() {
        this.button.classList.add("selected")
        this.dialog.show()
    }

    hide() {
        this.button.classList.remove("selected")
        this.dialog.close()
    }

    display_error(msg) {
        this.clear_suggestions()
        this.error.innerHTML = msg
        this.error.style.display = "block"
    }

    hide_error() {
        this.error.style.display = "none"
    }

    show_suggestions() {
        this.suggestions.style.display = "block"
    }

    hide_suggestions() {
        this.suggestions.style.display = "none"
    }

    clear_suggestions() {
        this.suggestions.replaceChildren()
        this.hide_suggestions()
    }

    display_suggestions(suggestions) {
        suggestions.forEach((d) => {
            const div = document.createElement("div")
            div.classList.add("suggestion")
            div.innerHTML = `<span>${d.sci_name}</span><br />${d.taxid}${d.common_name != "" ? ` - ${d.common_name}` : ""}`
            div.setAttribute("data-taxid", d.taxid)
            div.addEventListener("click", this.suggestion_clicked.bind(this))
            this.suggestions.appendChild(div)
        })
        this.show_suggestions()
    }

    suggestion_clicked(event) {
        const sugg = event.currentTarget
        const taxid = sugg.getAttribute("data-taxid")
        this.zoom_to_taxid(taxid)
    }

    async input_changed(event) {
        this.hide_error()
        this.clear_suggestions()
        const value = event.target.value.trim()
        if (value.length > 0) {
            const suggestions = await fetch_suggestions(event.target.value, 5)
            if (suggestions == null) {
                this.display_error(`An error occured while querying Lifemap API.`)
            } else {
                this.display_suggestions(suggestions)
            }
        }
    }

    async input_validated(event) {
        const value = event.target.value
        this.hide_error()
        if (value != "" && Number.isFinite(Number(value))) {
            this.zoom_to_taxid(value)
        }
        event.preventDefault()
    }

    async zoom_to_taxid(taxid) {
        const result = await get_taxid_coords(Number(taxid))
        if (result === null) {
            this.display_error(`An error occured while querying Lifemap API.`)
        } else if (result === undefined) {
            this.display_error(`taxid ${Number(taxid)} not found in Lifemap taxids.`)
        } else {
            this.hide()
            const view = this.base_map.map.getView()
            const center = fromLonLat([result["lon"], result["lat"]])
            flyTo(view, center, result["zoom"] - 3)
        }
    }
}

import { get_taxid_coords, fetch_suggestions } from "../api"
import { fromLonLat } from "ol/proj"
import { inAndOut } from "ol/easing"

export class SearchDialog {
    constructor(el, map) {
        this.create_dialog(el)
        this.map = map
    }

    create_dialog(el) {
        // Dialog
        const dialog = document.createElement("dialog")

        // Search input field
        const input = document.createElement("input")
        input.type = "search"
        input.placeholder = "Taxa name or id..."
        input.name = "pylifemap-search"
        dialog.appendChild(input)

        input.addEventListener("change", this.input_validated.bind(this))
        input.addEventListener("input", this.input_changed.bind(this))

        // Error message
        const error = document.createElement("div")
        error.classList.add("error")
        dialog.appendChild(error)

        // Suggestions list
        const suggestions = document.createElement("div")
        suggestions.classList.add("suggestions")
        dialog.appendChild(suggestions)

        el.appendChild(dialog)

        this.search_button = el.querySelector("button")
        this.dialog = dialog
        this.input = input
        this.error = error
        this.suggestions = suggestions
    }

    display_error(msg) {
        this.error.innerHTML = msg
        this.error.style.display = "block"
    }

    hide_dialog() {
        this.search_button.classList.remove("selected")
        this.dialog.close()
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
        this.input.value = taxid
        this.input.dispatchEvent(new Event("change"))
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
            const result = await get_taxid_coords(Number(value))
            if (result === null) {
                this.display_error(`An error occured while querying Lifemap API.`)
            } else if (result === undefined) {
                this.clear_suggestions()
                this.display_error(`taxid ${Number(value)} not found in Lifemap taxids.`)
            } else {
                this.hide_dialog()
                const view = this.map.getView()
                view.animate({
                    center: fromLonLat([result["lon"], result["lat"]]),
                    zoom: result["zoom"] - 3,
                    duration: 2000,
                    easing: inAndOut,
                })
            }
        }
        event.preventDefault()
    }
}

import { get_taxid_coords, fetch_suggestions } from "../api"
import { fromLonLat } from "ol/proj"
import { inAndOut } from "ol/easing"

export class SearchOverlay {
    constructor(el, map) {
        this.create_overlay(el)

        this.map = map
    }

    create_overlay(el) {
        // Overlay
        const overlay = document.createElement("div")
        overlay.classList.add("lifemap-search")

        // Overlay content
        const overlay_content = document.createElement("div")
        overlay_content.classList.add("content")
        overlay.appendChild(overlay_content)

        // Overlay close button
        const overlay_close = document.createElement("button")
        overlay_close.classList.add("close-button")
        overlay_close.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>close-circle-outline</title><path d="M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M14.59,8L12,10.59L9.41,8L8,9.41L10.59,12L8,14.59L9.41,16L12,13.41L14.59,16L16,14.59L13.41,12L16,9.41L14.59,8Z" /></svg>'
        overlay_close.addEventListener("click", this.hide.bind(this), false)
        overlay.appendChild(overlay_close)

        // Search input field
        const input = document.createElement("input")
        input.type = "search"
        input.placeholder = "Taxa name or id..."
        input.name = "pylifemap-search"
        overlay_content.appendChild(input)

        input.addEventListener("change", this.input_validated.bind(this))
        input.addEventListener("input", this.input_changed.bind(this))

        // Error message
        const error = document.createElement("div")
        error.classList.add("error")
        overlay_content.appendChild(error)

        // Suggestions list
        const suggestions = document.createElement("div")
        suggestions.classList.add("suggestions")
        overlay_content.appendChild(suggestions)

        el.querySelector(".ol-viewport").appendChild(overlay)

        this.overlay = overlay
        this.overlay_content = overlay_content
        this.input = input
        this.error = error
        this.suggestions = suggestions
    }

    show() {
        this.overlay.style.display = "block"
        document.addEventListener("keydown", this.handle_escape.bind(this))
        this.input.focus()
        this.input.select()
    }

    hide() {
        this.overlay.style.display = "none"
        document.removeEventListener("keydown", this.handle_escape)
    }

    handle_escape(event) {
        if (event.key === "Escape") {
            this.hide()
            event.preventDefault()
        }
    }

    display_error(msg) {
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
        console.log(sugg)
        this.input.value = taxid
        this.input.dispatchEvent(new Event("change"))
    }

    async input_changed(event) {
        this.hide_error()
        this.clear_suggestions()
        const value = event.target.value.trim()
        if (value.length > 0) {
            const suggestions = await fetch_suggestions(event.target.value, 8)
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
                this.display_error(`taxid ${Number(value)} not found in Lifemap taxids.`)
            } else {
                this.hide()
                const view = this.map.getView()
                console.log(result)
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

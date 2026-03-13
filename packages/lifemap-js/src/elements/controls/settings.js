import Control from "ol/control/Control.js"
import { THEMES } from "../themes"

export class SettingsControl extends Control {
    constructor(options = {}) {
        const { top, base_map } = options

        const container = document.createElement("div")
        container.className =
            "lifemap-settings pylifemap-control ol-unselectable ol-control"
        container.style.top = `${top}em`

        super({
            element: container,
            target: options.target,
        })
        this.base_map = base_map

        const control = document.createElement("div")
        control.className = "pylifemap-control ol-unselectable ol-control"
        const button = document.createElement("button")
        button.setAttribute("title", "Settings")
        button.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10.5 1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4H1.5a.5.5 0 0 1 0-1H10V1.5a.5.5 0 0 1 .5-.5M12 3.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m-6.5 2A.5.5 0 0 1 6 6v1.5h8.5a.5.5 0 0 1 0 1H6V10a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5M1 8a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2A.5.5 0 0 1 1 8m9.5 2a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V13H1.5a.5.5 0 0 1 0-1H10v-1.5a.5.5 0 0 1 .5-.5m1.5 2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5"/></svg>'
        container.appendChild(button)

        button.addEventListener("click", () => this.handle_click(), false)

        this.container = container
        this.button = button
        this.dialog = new SettingsDialog(this.container, this.button, this.base_map)
    }

    handle_click() {
        if (this.dialog.dialog.open) {
            this.dialog.hide()
        } else {
            if ("taxa_search" in this.base_map.controls) {
                this.base_map.controls.taxa_search.dialog.hide()
            }
            this.dialog.show()
        }
    }
}

class SettingsDialog {
    constructor(el, button, base_map) {
        this.base_map = base_map

        // Dialog
        const dialog = document.createElement("dialog")

        // Settings form
        const form = document.createElement("form")

        // Legend
        const legend_div = document.createElement("div")
        const legend_label = document.createElement("label")
        const legend_input = document.createElement("input")
        legend_input.type = "checkbox"
        legend_input.name = "show_legend"
        legend_input.checked = !this.base_map.hide_legend
        legend_label.appendChild(legend_input)
        legend_label.appendChild(document.createTextNode(" Show legend"))
        legend_div.appendChild(legend_input)
        legend_div.appendChild(legend_label)

        // Theme
        const theme_div = document.createElement("div")
        const theme_label = document.createElement("label")
        theme_label.textContent = "Theme: "
        theme_label.setAttribute("for", "theme")
        const theme_input = document.createElement("select")
        theme_input.id = "theme"
        theme_input.name = "theme"
        theme_div.appendChild(theme_label)
        theme_div.appendChild(theme_input)

        const theme_options = Object.keys(THEMES).map((d) => ({ value: d, text: d }))

        theme_options.forEach((option) => {
            const option_el = document.createElement("option")
            option_el.value = option.value
            option_el.textContent = option.text
            option_el.selected = option_el.value == this.base_map.theme
            theme_input.appendChild(option_el)
        })

        // Add form elements
        form.appendChild(theme_div)
        form.appendChild(legend_div)

        dialog.appendChild(form)
        el.appendChild(dialog)

        this.button = button
        this.dialog = dialog
        this.theme_input = theme_input
        this.legend_input = legend_input

        this.legend_input.addEventListener(
            "change",
            (event) => this.legend_input_changed(event),
            false
        )
        this.theme_input.addEventListener(
            "change",
            (event) => this.theme_input_changed(event),
            false
        )

        dialog.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.hide()
            }
        })
    }

    show() {
        this.button.classList.add("selected")
        this.dialog.show()
    }

    hide() {
        this.button.classList.remove("selected")
        this.dialog.close()
    }

    legend_input_changed(event) {
        this.base_map.switch_legend(event.target.checked)
    }

    theme_input_changed(event) {
        const new_theme = event.target.value
        this.base_map.switch_theme(new_theme)
    }
}

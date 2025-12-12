export class Spinner {
    constructor(el) {
        this.spinner = this.create_spinner(el)
    }

    create_spinner(el) {
        const spinner = document.createElement("div")
        spinner.classList.add("lifemap-spinner")
        el.querySelector(".ol-viewport").appendChild(spinner)
        return spinner
    }

    show() {
        this.spinner.style.display = "block"
    }

    hide() {
        this.spinner.style.display = "none"
    }
}

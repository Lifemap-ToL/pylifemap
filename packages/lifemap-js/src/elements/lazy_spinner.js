export class LazySpinner {
    constructor(el) {
        this.spinner = document.createElement("div")
        this.spinner.classList.add("lifemap-lazyspinner")
        el.querySelector(".ol-viewport").appendChild(this.spinner)
    }

    show() {
        this.spinner.style.display = "block"
    }

    hide() {
        this.spinner.style.display = "none"
    }
}

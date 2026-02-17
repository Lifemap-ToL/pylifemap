export class Spinner {
    constructor(el) {
        this.spinner = document.createElement("div")
        this.spinner.classList.add("lifemap-spinner")
        this.spinner_message = document.createElement("p")
        this.spinner.appendChild(this.spinner_message)
        el.querySelector(".ol-viewport").appendChild(this.spinner)
    }

    show(msg) {
        if (msg != null) {
            this.update_message(msg)
        }
        this.spinner.style.display = "block"
    }

    hide() {
        this.update_message("")
        this.spinner.style.display = "none"
    }

    update_message(msg) {
        this.spinner_message.innerHTML = msg
    }
}

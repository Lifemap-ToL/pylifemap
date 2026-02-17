export class ErrorMessage {
    constructor(el) {
        this.error_message = document.createElement("div")
        this.error_message.classList.add("lifemap-error")
        const error_message_content = document.createElement("p")
        this.error_message.appendChild(error_message_content)
        el.querySelector(".ol-viewport").appendChild(this.error_message)
    }

    show_message(e) {
        const msg = `<p><strong>Sorry, an error occured while creating the widget.</strong></p><p><em>Error: ${e.name} - ${e.message}</em></p>`
        this.error_message.querySelector("p").innerHTML = msg
        this.show()
    }

    show() {
        this.error_message.style.display = "block"
    }

    hide() {
        this.error_message.style.display = "none"
    }
}

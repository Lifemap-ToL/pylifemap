export class ErrorMessage {
    constructor(el) {
        this.error_message = this.create_error_message(el)
    }

    create_error_message(el) {
        const error_message = document.createElement("div")
        error_message.classList.add("lifemap-error")
        const error_message_content = document.createElement("p")
        error_message.appendChild(error_message_content)
        el.querySelector(".ol-viewport").appendChild(error_message)
        return error_message
    }

    show_message(e) {
        const msg = `<p><strong>Sorry, an error occured while creating the widget.</strong></p><p><em>Error: ${e.name} - ${e.message}</em></p>`
        console.log(msg)
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

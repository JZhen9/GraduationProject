import url from "url"

export default function checkIsValidateMessage(input: string | null): boolean {
    if (input == "" || input == null) {
        return false
    }
    let changeToUrl = url.parse(input)
    let protocol = changeToUrl.protocol || ""

    if (input.startsWith("-------------- Matched Type:")) {
        return true
    } else if (input.startsWith("!")) {
        return true
    }

    if (changeToUrl == null) {
        return false
    } else {
        if (protocol !== "app:" && protocol !== "pi:") {
            return false
        }
    }

    return true
}
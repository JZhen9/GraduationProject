import url from "url"

export default function checkIsValidateURL(input: string | null): boolean {
    if (input == "" || input == null) {
        return false
    }
    let changeToUrl = url.parse(input)
    let protocol = changeToUrl.protocol || ""

    if (protocol !== "app:" && protocol !== "pi:" && protocol !== "command:"){
        return false
    }

    return true
}
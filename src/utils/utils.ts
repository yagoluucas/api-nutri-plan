function isValidString(text: unknown): text is string {
    return typeof text === "string" && text !== "null" && text !== "undefined" && text.trim().length > 0
}

export {isValidString}
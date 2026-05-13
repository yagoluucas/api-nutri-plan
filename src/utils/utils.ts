import jwt from "jsonwebtoken";

function isValidString(text: unknown): text is string {
    return typeof text === "string" && text !== "null" && text !== "undefined" && text.trim().length > 0
}

function gerarToken(idUsuario: string) {
    if (!process.env.JWT_SECRET) throw new Error("Chave secreta JWT não configurada");

    return jwt.sign(
        { id: idUsuario },
        process.env.JWT_SECRET,
        {
            expiresIn: (process.env.JWT_EXPIRES_IN || "1d") as any,
        }
    );
}

export { isValidString, gerarToken } 
import { IAlimento } from "../../interfaces/alimentos/modelAlimentosInterface.js";

function alimentoValido(obj: unknown): obj is IAlimento {
    return (
        obj !== null
        && typeof obj === "object"
        && "codigoAlimento" in obj
        && "nomeAlimento" in obj
        && "linkAlimento" in obj
        && "grupo" in obj
        && "marca" in obj
        && "nutrientes" in obj
        && "medidasCaseiras" in obj
    );
}

export { alimentoValido };
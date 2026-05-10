import { IAlimento } from "./modelAlimentosInterface.js"
import { IRetornoApi } from "../generalInterfaces.js";

interface IRecuperarAlimentos extends IRetornoApi {
    alimentos?: IAlimento[]
}

export { IRecuperarAlimentos };
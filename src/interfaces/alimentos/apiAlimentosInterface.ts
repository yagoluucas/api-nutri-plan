import { IAlimento } from "./modelAlimentosInterface.js"
import { IRetornoApi } from "../generalInterfaces.js";

interface IRecuperarAlimentos extends IRetornoApi {
    alimentos?: IAlimento[]
}

interface ICadastrarAlimentos extends IRetornoApi {
    
}

export { IRecuperarAlimentos, ICadastrarAlimentos };
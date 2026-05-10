import { IAlimento } from "./modelAlimentosInterface.js"
import { IRetornoApi } from "../generalInterfaces.js";

interface IRecuperarAlimentos extends IRetornoApi {
    qtdAlimentosEncontrados?: number,
    alimentos?: IAlimento[]
}

interface ICadastrarAlimentos extends IRetornoApi {

}

export { IRecuperarAlimentos, ICadastrarAlimentos };
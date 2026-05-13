// Ensinando ao Typescript que o objeto Request do Express também pode ter uma propriedade chamada user.

/**
 * declare global -> Estou declarando algo global para o Typescript (Não é uma variável global e sim um tipo)
 * namespace Express -> Estou dizendo ao typecript que dentro do namespace Express vamos fazer uma alteração, pois esse namespace já existe
 * interface Request -> Estou falando apra o typescript que dentro da interface Request vamos passar a ter uma propriedade chamada user
 * user?: INutricionista -> Indica que essa nova propriedade será opcional (?) e será do tipo INutricionista
 */
declare global {
    namespace Express {
        interface Request{
            user?: INutricionista;
        }
    }
}


export {};
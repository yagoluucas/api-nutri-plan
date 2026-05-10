type tipoMedida = "Caseira" | "Tecnica";

interface INutriente {
    nomeComponente: string,
    valorPor100G: number | null,
    unidadeUtilizada: string
}

interface IMedidasCaseiras {
    nomeMedida: string,
    total: number,
    unidadeMedida: string,
    tipoMedida: tipoMedida
}

interface IAlimento {
    codigoAlimento: string,
    nomeAlimento: string, 
    linkAlimento: string,
    grupo: string | null,
    marca: string | null,
    nutrientes: INutriente[],
    medidasCaseiras: IMedidasCaseiras[]
}

export { INutriente, IMedidasCaseiras, IAlimento, tipoMedida };

import { NextFunction, Request, Response, Router } from 'express';
import { conectarAoBancoDeDados } from '../../database/conexaoAoBanco.js';
import { Alimento } from '../../database/alimentoModel.js';
import { isValidString } from '../../utils/utils.js';
import { IAlimentoSchema, IAlimento } from '../../interfaces/alimentos/modelAlimentosInterface.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { IErrorCause } from '../../interfaces/errors/erros.js';

const DEFAULT_AUTOCOMPLETE_LIMIT = 50;
const MAX_AUTOCOMPLETE_LIMIT = 50;

type AlimentoAutocomplete = Pick<IAlimento, 'codigoAlimento' | 'nomeAlimento'>;

function parsePositiveInteger(value: unknown, defaultValue: number): number {
    if (Array.isArray(value)) {
        return parsePositiveInteger(value[0], defaultValue);
    }

    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
        return defaultValue;
    }

    return parsedValue;
}

function parseAutocompleteLimit(value: unknown): number {
    return Math.min(parsePositiveInteger(value, DEFAULT_AUTOCOMPLETE_LIMIT), MAX_AUTOCOMPLETE_LIMIT);
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function buscarAlimentoPeloCodigo(req: Request, res: Response, next: NextFunction) {

    const foodCode = req.query?.foodCode;

    if (!isValidString(foodCode)) {
        next(new Error("Código do alimento inválido", { cause: { cause: "Invalid Query Param" } as IErrorCause }));
        return;
    }

    try {
        await conectarAoBancoDeDados();

        const alimentoParsed = IAlimentoSchema.safeParse(await Alimento.findOne({ codigoAlimento: foodCode }));

        if (!alimentoParsed.success) {
            next(new Error("Alimento não encontrado", { cause: { cause: "Not Found", statusCode: 404 } as IErrorCause }));
            return;
        }

        return {
            message: "Alimento encontrado com sucesso",
            error: false,
            statusCode: 200,
            alimentos: [alimentoParsed.data]
        };
    } catch (error) {
        console.log(`[Buscar Alimento Pelo Código] - Error: ${error}`)
        next(error);
    }
}

async function buscaAlimentoAutoComplete(req: Request, res: Response, next: NextFunction) {
    const foodName = req.query.foodName;

    if (!isValidString(foodName)) {
        next(new Error("Nome do alimento não informado", { cause: { cause: "Invalid Query Param" } as IErrorCause }));
        return;
    }

    const normalizedFoodName = foodName.trim().replace(/\s+/g, ' ');
    const normalizedFoodNameLower = normalizedFoodName.toLowerCase();
    const searchTerms = normalizedFoodName.split(' ').filter(word => word.trim() !== '');
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parseAutocompleteLimit(req.query.limit);
    const offset = (page - 1) * limit;

    try {
        await conectarAoBancoDeDados();

        const query = {
            $and: searchTerms.map(term => ({
                nomeAlimento: { $regex: escapeRegex(term), $options: "i" }
            }))
        };

        const escapedNormalizedFoodName = escapeRegex(normalizedFoodNameLower);
        const escapedFirstTerm = escapeRegex(searchTerms[0].toLowerCase());

        const alimentosRaw = await Alimento.aggregate<AlimentoAutocomplete>([
            { $match: query },
            {
                $addFields: {
                    nomeAlimentoLower: { $toLower: "$nomeAlimento" },
                    exactMatchPriority: {
                        $cond: [
                            { $eq: [{ $toLower: "$nomeAlimento" }, normalizedFoodNameLower] },
                            0,
                            1
                        ]
                    },
                    startsWithSearchPriority: {
                        $cond: [
                            {
                                $regexMatch: {
                                    input: { $toLower: "$nomeAlimento" },
                                    regex: `^${escapedNormalizedFoodName}`
                                }
                            },
                            0,
                            1
                        ]
                    },
                    firstTermAtStartPriority: {
                        $cond: [
                            {
                                $regexMatch: {
                                    input: { $toLower: "$nomeAlimento" },
                                    regex: `^${escapedFirstTerm}(\\b|[\\s,;()\\-/])`
                                }
                            },
                            0,
                            1
                        ]
                    },
                    wordBoundaryPriority: {
                        $cond: [
                            {
                                $regexMatch: {
                                    input: { $toLower: "$nomeAlimento" },
                                    regex: `(^|[\\s,;()\\-/])${escapedNormalizedFoodName}(\\b|[\\s,;()\\-/])`
                                }
                            },
                            0,
                            1
                        ]
                    },
                    nameLength: { $strLenCP: "$nomeAlimento" }
                }
            },
            {
                $sort: {
                    exactMatchPriority: 1,
                    startsWithSearchPriority: 1,
                    firstTermAtStartPriority: 1,
                    wordBoundaryPriority: 1,
                    nameLength: 1,
                    nomeAlimento: 1
                }
            },
            { $skip: offset },
            { $limit: limit + 1 },
            {
                $project: {
                    _id: 0,
                    codigoAlimento: 1,
                    nomeAlimento: 1
                }
            }
        ]);

        // Como estamos retornando apenas alguns campos no select(), usamos o .partial() para
        // não dar erro nos campos faltantes, e .array() para validar a lista
        const alimentos = IAlimentoSchema.partial().array().safeParse(alimentosRaw);

        if (!alimentos.success || alimentos.data.length === 0) {
            next(new Error("Erro ao validar alimentos ou nenhum encontrado", { cause: { cause: "Not Found", statusCode: 404 } as IErrorCause }));
            return;
        }

        const hasNextPage = alimentos.data.length > limit;
        const alimentosPaginaAtual = alimentos.data.slice(0, limit);

        return {
            message: "Alimentos recuperados com sucesso",
            error: false,
            statusCode: 200,
            qtdAlimentosEncontrados: alimentosPaginaAtual.length,
            page,
            hasNextPage,
            alimentos: alimentosPaginaAtual.map((alimento) => {
                return {
                    codigoAlimento: alimento.codigoAlimento,
                    nomeAlimento: alimento.nomeAlimento
                }
            })
        };
    } catch (error) {
        console.log(`[Buscar Alimento AutoComplete] - Error: ${error}`)
        next(error);
    }
}

// Criação das rotas
const recuperarAlimentosRouter = Router();

recuperarAlimentosRouter.get('/', authMiddleware, async (req, res, next) => {
    const result = await buscarAlimentoPeloCodigo(req, res, next);
    if (result) {
        return res.status(result.statusCode).json(result);
    }
});

recuperarAlimentosRouter.get('/autocomplete', authMiddleware, async (req, res, next) => {
    const result = await buscaAlimentoAutoComplete(req, res, next);
    if (result) {
        return res.status(result.statusCode).json(result);
    }
});

export { recuperarAlimentosRouter };
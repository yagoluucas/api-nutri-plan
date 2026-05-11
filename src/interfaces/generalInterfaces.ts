import { z } from "zod";

const IRetornoApiSchema = z.object({
    message: z.string(),
    error: z.boolean(),
    statusCode: z.number()
});

type IRetornoApi = z.infer<typeof IRetornoApiSchema>;

export { IRetornoApiSchema, IRetornoApi };
import { z } from "zod";

const IRetornoApiSchema = z.object({
    message: z.string().min(5),
    error: z.boolean(),
    statusCode: z.number()
});

type IRetornoApi = z.infer<typeof IRetornoApiSchema>;

export { IRetornoApiSchema, IRetornoApi };
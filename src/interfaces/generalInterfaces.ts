import { z } from "zod";

const IRetornoApiSchema = z.object({
    message: z.string().min(5),
    error: z.boolean(),
    statusCode: z.number()
});

const IIdPacienteParamsSchema = z
  .object({
    idPaciente: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{24}$/, "Id do paciente invalido"),
  })
  .strict();

export { IIdPacienteParamsSchema, IRetornoApiSchema };

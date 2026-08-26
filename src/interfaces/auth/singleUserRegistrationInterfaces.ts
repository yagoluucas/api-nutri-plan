import { z } from "zod";
import { IRetornoApiSchema } from "../generalInterfaces.js";

const ISingleUserRegistrationConfigurationSchema = z.discriminatedUnion(
  "enabled",
  [
    z.object({ enabled: z.literal(false) }).strict(),
    z
      .object({
        enabled: z.literal(true),
        secret: z
          .string()
          .min(32, "O segredo deve conter entre 32 e 256 caracteres.")
          .max(256, "O segredo deve conter entre 32 e 256 caracteres.")
          .refine(
            (value) =>
              !/^(your|change|replace|troque|configure|exemplo|um-segredo)/i.test(
                value,
              ),
            "O segredo nao pode utilizar um valor de exemplo.",
          ),
      })
      .strict(),
  ],
);

const ISingleUserRegistrationLockIdSchema = z.literal(
  "nutricionista-registration",
);

const ISingleUserRegistrationLockDBSchema = z
  .object({
    _id: ISingleUserRegistrationLockIdSchema,
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
  })
  .strict();

const ISingleUserRegistrationCreatedResponseSchema = IRetornoApiSchema.extend({
  error: z.literal(false),
  statusCode: z.literal(201),
}).strict();

type ISingleUserRegistrationConfiguration = z.infer<
  typeof ISingleUserRegistrationConfigurationSchema
>;
type ISingleUserRegistrationLockDB = z.infer<
  typeof ISingleUserRegistrationLockDBSchema
>;

export {
  ISingleUserRegistrationConfigurationSchema,
  ISingleUserRegistrationCreatedResponseSchema,
  ISingleUserRegistrationLockDBSchema,
  ISingleUserRegistrationLockIdSchema,
};
export type {
  ISingleUserRegistrationConfiguration,
  ISingleUserRegistrationLockDB,
};

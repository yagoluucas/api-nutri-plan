import { z } from "zod";

const IPublicErrorCauseSchema = z.enum([
  "Validation Error",
  "Authentication Failed",
  "Unauthorized",
  "Forbidden",
  "Invalid Request",
  "Invalid Query Param",
  "Not Found",
  "Conflict",
  "Internal Server Error"
]);

const IInternalErrorCauseSchema = z.enum([
  "User Already Registered",
  "Invalid Credentials",
  "Invalid Token",
  "Invalid Query Param",
  "Data Not Found",
  "Database Error",
  "Unexpected Error"
]);

const IErrorCauseSchema = z.object({
  cause: IPublicErrorCauseSchema,
  internalCause: IInternalErrorCauseSchema.optional(),
  statusCode: z.number().optional().default(400),
});

type IErrorCause = z.infer<typeof IErrorCauseSchema>;

export {
  IErrorCauseSchema,
  IErrorCause
};
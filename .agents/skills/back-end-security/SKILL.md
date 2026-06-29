---
name: back-end-security
description: Review Nutri Plan API security for non-layout backend changes in Node.js, Express, TypeScript, Mongoose, MongoDB, Zod, JWT, CORS, authentication, protected routes, environment variables, error handling, and sensitive user data. Use when a backend change may affect application or user security, or when asked to audit new or existing vulnerabilities.
---

# Back-end Security

## Review Flow

Use this skill for API changes that may affect auth, authorization, validation, persistence, secrets, errors, or user data.

1. Read the project `AGENTS.md` first.
2. Identify touched routes, schemas, models, middleware, environment variables, and database queries.
3. Inspect the changed files plus their callers and route registration in `src/server.ts` when relevant.
4. Report findings first, ordered by severity, with file and line references.
5. If asked to fix issues, keep edits scoped and preserve existing API contracts unless the contract is insecure.

## What To Check

- Validate all request bodies, params, query strings, JWT payloads, and critical DB results with Zod.
- Keep schemas and inferred types in `src/interfaces`, following the project naming pattern.
- Keep protected routes behind `authMiddleware`.
- Do not make `/alimentos`, `/refeicoes`, `/planoAlimentar`, patient data, or user-specific data public.
- Do not trust user IDs from the request body for authorization when `req.user` should be authoritative.
- Generate JWTs with `JWT_SECRET` and expiration; never hardcode secrets.
- Accept protected-route tokens only via `Authorization: Bearer <token>` in the API.
- Do not return JWTs in auth response bodies; expose them only in the `Authorization` response header for the Next server-side proxy.
- Do not add `Access-Control-Expose-Headers: Authorization` unless explicitly required and reviewed.
- Never return passwords, password hashes, CRN, birth date, secrets, connection strings, stack traces, raw Mongo/JWT/bcrypt errors, or internal headers.
- Use `.select("+senha")` only in the login path where password comparison is required.
- Keep password hashing strong and do not lower bcrypt cost without a clear reason.
- Avoid mass assignment of unvalidated request data into Mongoose models.
- Escape or avoid user-controlled regex patterns; limit autocomplete and broad searches.
- Keep CORS explicit. Do not combine wildcard origins with credentials in production.
- Do not log JWTs, passwords, auth headers, secrets, or full login payloads.
- Return controlled status codes and messages for auth, validation, conflict, and not-found cases.

## Useful Searches

Run focused searches while reviewing security-sensitive backend changes:

```bash
rg "authMiddleware|Authorization|Bearer|jwt|JWT_SECRET" src
rg "safeParse|z.object|ZodError|zod|z.infer" src
rg "select\\(\"\\+senha\"\\)|validarSenha|bcrypt" src
rg "console.log|console.error" src/modules src/middlewares src/utils
rg "CORS_ORIGINS|CORS_ORIGIN|FRONTEND_URL|CORS_CREDENTIALS" src
rg "req.body|req.query|req.params|req.user" src/modules src/middlewares
rg "\\$regex|RegExp|find\\(|findOne\\(|create\\(" src
```

## Validation

After relevant fixes, run:

```bash
npm run build
```

Do not invent lint or test commands if they do not exist in `package.json`.

## Review Output

When reviewing code, lead with findings:

- `P0`: auth bypass, exposed JWT/secret/password/hash, protected data public, route missing auth, privilege escalation.
- `P1`: missing validation on sensitive input, unsafe CORS, sensitive error/log leakage, unsafe token handling, NoSQL/regex injection risk.
- `P2`: weak authorization boundaries, overbroad responses, fragile JWT payload handling, incomplete error status handling.
- `P3`: defense-in-depth improvements and follow-up hardening.

If no issues are found, say that clearly and list any residual risk or tests not run.

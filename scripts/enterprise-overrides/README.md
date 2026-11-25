# AGPL overrides for stripped Enterprise files

Each file here is written for Growth OS CRM (AGPL-3.0) and sits at the same
repo-relative path as an upstream file marked `@license Enterprise`.
`scripts/strip-enterprise.ts` writes it in place of the generated stub.

Rules:
- Write from scratch. Do not copy Enterprise code. Keep only the exported names
  and signatures that AGPL callers need.
- Implement "feature not available" behaviour (no-op, empty, disabled), never
  an allow-everything bypass of a security check.
- Keep each override small. Anything bigger belongs in normal AGPL code.

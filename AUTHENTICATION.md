# Authentication and Session Security

## Purpose

This document describes the authentication flow and security controls that should be used if authentication is added to CashFlowPilot. It is a design and implementation checklist, not a claim that these controls are already implemented in the current prototype.

## Current prototype notes

The project README describes a lightweight cash-flow dashboard that can be opened as `index.html` or served locally with Python's `http.server`. A static HTML page or a local static-file server does not, by itself, provide secure user authentication or enforce authorization for financial records.

Before describing authentication as implemented, verify the actual source code, backend routes, database schema, and deployment configuration.

## Recommended architecture

1. **Frontend:** Collects login/signup input and displays authenticated pages. It must not be the sole enforcement point for access to financial data.
2. **Authentication backend:** Validates credentials, creates sessions or tokens, and handles logout, expiration, and account recovery.
3. **User store:** Stores a stable user identifier and a salted password hash, never plaintext passwords.
4. **Authorization layer:** Checks the authenticated user's permissions for every protected operation and ensures that each business record belongs to the requesting user or an authorized organization.
5. **Secrets/configuration:** Keeps database credentials, token-signing keys, and third-party secrets in environment configuration or a secrets manager, not in source control.

## Recommended request flow

1. A user submits credentials over HTTPS.
2. The server validates input and looks up the account.
3. The server verifies the submitted password against the stored password hash using a suitable password-hashing library.
4. If verification succeeds, the server creates a server-side session or issues a short-lived access token.
5. The browser includes the session cookie or token on subsequent requests.
6. The server validates the session/token and checks authorization before returning financial data or performing a write.
7. Logout invalidates the server-side session or revokes the relevant token where supported.

Return generic login errors so that responses do not reveal whether a particular email address or username exists.

## Credential handling

- Never store or log plaintext passwords.
- Use a maintained password-hashing implementation such as Argon2id, scrypt, or bcrypt with appropriate parameters.
- Enforce HTTPS in deployed environments.
- Validate inputs on the server; client-side validation is only a usability aid.
- Add rate limiting and monitoring to login and account-recovery endpoints.
- Keep password-reset tokens random, short-lived, single-use, and securely stored.
- Do not put passwords or long-lived secrets in URLs, browser local storage, logs, or source code.

## Session and token handling

Choose a session strategy appropriate to the architecture and document the actual implementation.

### Cookie-based sessions

- Use `HttpOnly`, `Secure`, and an appropriate `SameSite` cookie attribute.
- Regenerate the session identifier after login and privilege changes.
- Set reasonable idle and absolute expiration limits.
- Invalidate sessions on logout and, where appropriate, after password changes.
- Protect state-changing requests against cross-site request forgery (CSRF).

### Token-based authentication

- Verify token signatures using trusted keys and approved algorithms.
- Validate expiration and relevant issuer, audience, and subject claims.
- Use short-lived access tokens and a deliberate refresh/revocation strategy.
- Never accept a token solely because it is present; verify it on the server.
- Avoid placing long-lived tokens in browser local storage when a safer architecture is available.

Do not implement both strategies unnecessarily. Record which strategy the application actually uses once the source code has been reviewed.

## Financial-data authorization

Authentication establishes who is making a request; authorization decides what they may access.

For every operation involving cash balances, revenue, payroll, receivables, supplier dues, loans, or forecasts:

- Derive the user identity from the validated session/token, not from a client-supplied user ID alone.
- Check ownership or organization membership on every read and write.
- Deny access by default when permissions are missing.
- Avoid exposing private financial information in URLs, error messages, or logs.
- Test that one account cannot access another account's data by changing record IDs.

## Configuration and repository hygiene

- Keep `.env`, private keys, credentials, and production data out of Git.
- Provide a sanitized `.env.example` containing placeholder values only.
- Rotate any secret that has been committed accidentally; deleting it in a later commit does not remove it from repository history.
- Use dependency updates and security scanning where practical.
- Never include real user financial records in test fixtures or public demos.

## Verification checklist

- [ ] Authentication endpoints and middleware are identified in the source.
- [ ] Passwords are hashed with a maintained password-hashing library.
- [ ] HTTPS is enforced in production.
- [ ] Session/token validation and expiry are tested.
- [ ] Logout and account recovery are tested.
- [ ] Authorization is checked for every financial-data operation.
- [ ] Cross-user access attempts are denied.
- [ ] Secrets and sensitive data are absent from source control and logs.
- [ ] Documentation matches the actual implementation.

## Implementation status

**Status: Not verified.** This file provides recommended design guidance. Update this section after reviewing the actual source files and tests. Do not represent the checklist as evidence that authentication has already been implemented.

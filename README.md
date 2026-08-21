# Noirly Identity

Central authentication and OpenID Connect (OIDC) provider for the Noirly application ecosystem.

One Noirly account authenticates users across future products (CRM, Flow, Docs, Atlas, and more) using standard **OAuth 2.0 Authorization Code + PKCE** and **OpenID Connect**. For React Native (native UI, no WebView), use [@noirly-dev/identity-mobile](docs/INTEGRATION.md#11-native-mobile-sdk-no-webview).

```text
                    Noirly Identity
                    auth.noirly.com
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
      Noirly CRM      Noirly Flow     Noirly Docs
```

## Stack

- Next.js (App Router) + TypeScript
- MongoDB + Mongoose
- Argon2id password hashing
- Jose (RS256 ID tokens / JWKS)
- Zod request validation

## Quick start

```bash
npm install
npm run env:generate          # creates .env.local with RSA keys + secrets
# start MongoDB locally, then:
npm run db:seed               # test user + NoirlyCRM OAuth client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Identity locally |
| `npm run env:generate` | Generate `.env.local` secrets + RS256 keys |
| `npm run db:seed` | Seed test user + NoirlyCRM client |
| `npm test` | Run security-critical tests |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Architecture overview

| Concern | Location |
| --- | --- |
| Auth APIs | `app/api/auth/*` |
| OAuth endpoints | `app/api/oauth/*` |
| OIDC endpoints | `app/api/oidc/*`, `app/.well-known/*` |
| Domain logic | `lib/auth`, `lib/oauth`, `lib/oidc`, `lib/sessions`, `lib/tokens` |
| Models | `models/*` |
| Validation | `lib/validation/schemas.ts` |
| Email abstraction | `lib/email` |

Sessions for the Identity UI use **HTTP-only cookies** (hashed at rest). Access tokens for APIs are **opaque** and stored hashed. ID tokens are **RS256 JWTs**.

## API surface

### Auth (cookie session)

- `GET /api/auth/csrf`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Cookie-authenticated mutating routes require `X-CSRF-Token` matching the `noirly_csrf` cookie.

### Admin (cookie session, `admin` role)

- `GET /api/admin/clients`
- `POST /api/admin/clients` — create or add origins for any Noirly app
- `PATCH /api/admin/clients/:clientId` — add origins, rotate secret, enable/disable

UI: sign in as an admin and open `/clients`. Grant admin with:

```bash
npm run user:promote-admin -- --email=you@example.com
```

That writes to the MongoDB in Identity’s `MONGODB_URI` (local `.env.local` for local, Atlas for production).

### OAuth / OIDC

- `GET /api/oauth/authorize`
- `POST /api/oauth/consent`
- `POST /api/oauth/token`
- `POST /api/oauth/revoke`
- `GET /api/oidc/userinfo`
- `GET /api/oidc/logout`
- `GET /.well-known/openid-configuration`
- `GET /.well-known/jwks.json`

## Integrating a Noirly application

See **[docs/INTEGRATION.md](docs/INTEGRATION.md)** for the full guide (client registration, PKCE, token exchange, UserInfo, logout, refresh rotation, errors).

High-level flow:

```text
NoirlyCRM
   |
   | GET /api/oauth/authorize  (+ PKCE, state, nonce)
   v
Noirly Identity  (login + consent)
   |
   | redirect ?code=&state=
   v
NoirlyCRM
   |
   | POST /api/oauth/token
   v
access_token + id_token (+ refresh_token if offline_access)
```

## Security

See **[docs/SECURITY.md](docs/SECURITY.md)**.

Highlights:

- Argon2id for passwords and confidential client secrets
- Exact redirect URI matching (no open redirects)
- PKCE (S256), state, nonce
- Short-lived single-use authorization codes
- Refresh token rotation + reuse detection
- Session revocation on logout / password change
- Rate limiting and login lockout
- No secrets in logs

## Organizations (prepared)

Models `Organization` and `OrganizationMembership` (`owner` | `admin` | `member`) are present for future multi-tenant features. Product-specific authorization should live in each app, using Identity only as the authN source of truth.

## License

Private — Noirly.

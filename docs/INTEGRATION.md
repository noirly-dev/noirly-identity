## Google sign-in (hosted by Identity)

Applications such as Noirly Flow should **not** integrate Google directly.

Instead:

1. Configure `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on Identity
2. Set Google redirect URI to `{APP_URL}/api/auth/google/callback`
3. In the product app, show a **Noirly Login** button that starts OIDC against Identity
4. On Identity login, users can choose **Continue with Google**

This keeps one Noirly account across the ecosystem.

# Integrating with Noirly Identity

This guide shows how a future Noirly application (for example **NoirlyCRM** or **NoirlyFlow**) authenticates users through Noirly Identity using OAuth 2.0 Authorization Code + PKCE and OpenID Connect.

## 1. Register an OAuth client

Clients are stored in MongoDB (`OAuthClient`). The production way is the **admin generator** in Identity:

1. Sign in to Identity as an admin
2. Open `/clients` (also linked from Account)
3. Enter the app name, client id (`noirly-ledger`, `noirly-pulse`, …), and one origin per line (localhost + production)
4. Copy the printed `AUTH_NOIRLY_*` values into that app’s env and redeploy

Re-running the generator for an existing client **adds origins** and does not rotate the secret. Use **Rotate secret** only when you intend to invalidate the old one.

CLI remains available for local/automation:

```bash
npm run db:seed
```

Example seeded confidential client:

```text
name: NoirlyCRM
client_id: noirly-crm
client_secret: <printed once by seed>
redirect_uri: http://localhost:3001/api/auth/callback/noirly
post_logout_redirect_uri: http://localhost:3001/
```

### Client types

| Type | Secret | PKCE |
| --- | --- | --- |
| `confidential` (server apps) | Required (Argon2id hashed at rest) | Recommended / required if `requirePkce=true` |
| `public` (SPAs/native) | None | Required |

### Redirect URIs

- Must be registered exactly (scheme, host, port, path, no arbitrary URLs)
- Authorization `redirect_uri` must match one registered value character-for-character
- Logout `post_logout_redirect_uri` must be in `postLogoutRedirectUris`

### Scopes

Initial scopes:

- `openid` (required)
- `profile`
- `email`

Prepared for later:

- `offline_access` (refresh tokens)
- `roles`
- `organizations`

A client may only request scopes listed in its `allowedScopes`.

## 2. Discovery

```http
GET /.well-known/openid-configuration
```

Use `issuer`, `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`, and `end_session_endpoint` from the document. Prefer discovery over hard-coding paths.

JWKS:

```http
GET /.well-known/jwks.json
```

Public keys only. ID tokens are signed with **RS256**.

## 3. Authorization request

Generate:

- `state` (CSRF protection for the redirect)
- `nonce` (bound into the ID token)
- PKCE `code_verifier` + `code_challenge` (S256)

Example:

```http
GET /api/oauth/authorize
  ?client_id=noirly-crm
  &redirect_uri=http://localhost:3001/api/auth/callback/noirly
  &response_type=code
  &scope=openid%20profile%20email%20offline_access
  &state=random-state
  &nonce=random-nonce
  &code_challenge=BASE64URL(SHA256(code_verifier))
  &code_challenge_method=S256
```

Only `response_type=code` is supported (no implicit flow).

If the user is not signed in to Identity, they are redirected to `/login`. After login, consent is collected at `/consent` when the client requires it.

Successful redirect:

```text
http://localhost:3001/api/auth/callback/noirly?code=...&state=...
```

Validate `state` before exchanging the code.

## 4. Token exchange

```http
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=http://localhost:3001/api/auth/callback/noirly
&client_id=noirly-crm
&client_secret=CLIENT_SECRET
&code_verifier=CODE_VERIFIER
```

Confidential clients may also use HTTP Basic (`client_id:client_secret`).

Example response:

```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "id_token": "...",
  "scope": "openid profile email offline_access"
}
```

### ID token claims

Validate with JWKS:

- `iss` = configured issuer
- `aud` = your `client_id`
- `sub` = stable user id (never treat email as the permanent subject)
- `exp` / `iat` / `auth_time`
- `nonce` matches the value you sent
- profile/email claims according to granted scopes

## 5. UserInfo

```http
GET /api/oidc/userinfo
Authorization: Bearer ACCESS_TOKEN
```

Returns claims limited to the access token’s scopes.

## 6. Refresh tokens

Request `offline_access` to receive a refresh token.

```http
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=REFRESH_TOKEN
&client_id=noirly-crm
&client_secret=CLIENT_SECRET
```

Security behavior:

- Refresh tokens are stored hashed
- Each use **rotates** the token
- Reuse of an old rotated token **revokes the entire token family**
- Tokens are bound to user, client, and Identity session

## 7. Logout

```http
GET /api/oidc/logout
  ?client_id=noirly-crm
  &post_logout_redirect_uri=http://localhost:3001/
  &state=optional
```

Ends the Identity session and revokes associated access/refresh tokens for that session. Post-logout redirects are validated against the client allow-list.

## 8. Token revocation

```http
POST /api/oauth/revoke
Content-Type: application/x-www-form-urlencoded

token=ACCESS_OR_REFRESH
&token_type_hint=refresh_token
&client_id=noirly-crm
&client_secret=CLIENT_SECRET
```

## 9. Error responses

OAuth errors use standard fields:

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired"
}
```

Common codes: `invalid_request`, `invalid_client`, `invalid_grant`, `invalid_scope`, `access_denied`, `login_required`, `consent_required`.

Auth API errors:

```json
{
  "error": "invalid_credentials",
  "message": "Invalid email or password"
}
```

Login failures intentionally use generic messaging to reduce account enumeration.

## 10. Library recommendations

Any standards-compliant OIDC client works, for example:

- NextAuth / Auth.js (`Noirly` as OIDC provider)
- `openid-client`
- AppAuth (native)

Configure:

- issuer = Identity `OIDC_ISSUER`
- client id/secret from registration
- scopes including `openid`
- PKCE enabled

## Continue with Noirly

Product UX can offer **Continue with Noirly**, redirecting to:

```text
https://auth.noirly.com/api/oauth/authorize?...
```

Users keep one Noirly identity across the ecosystem; applications never store or manage Noirly passwords.

/**
 * Fetch the double-submit CSRF token. Forms load it on mount and also await
 * it at submit time (`csrf || await getCsrf()`), so a fast submit (password
 * manager autofill + Enter) never sends an empty token and gets a 403.
 */
export async function getCsrf(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}

export async function getCsrf(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  const data = (await res.json()) as { csrfToken: string };
  return data.csrfToken;
}

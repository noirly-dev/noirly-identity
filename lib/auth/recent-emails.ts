const STORAGE_KEY = "noirly-recent-emails";
const MAX_EMAILS = 6;

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function listRecentEmails(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter(isEmail)
      .slice(0, MAX_EMAILS);
  } catch {
    return [];
  }
}

export function rememberEmail(email: string): string[] {
  const normalized = email.trim().toLowerCase();
  if (!isEmail(normalized)) return listRecentEmails();
  const next = [normalized, ...listRecentEmails().filter((item) => item !== normalized)].slice(
    0,
    MAX_EMAILS,
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

export function forgetEmail(email: string): string[] {
  const normalized = email.trim().toLowerCase();
  const next = listRecentEmails().filter((item) => item !== normalized);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

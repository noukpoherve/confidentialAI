/**
 * Client-side auth helpers.
 * Token is stored in a plain (non-httpOnly) cookie so:
 *  - Server components / middleware can read it via request.cookies / cookies()
 *  - Client components can read it via document.cookie for Bearer headers
 */

const TOKEN_KEY = "ca_token";
const USER_KEY = "ca_user";
const MAX_AGE = 60 * 60 * 2; // 2 hours — matches AUTH_ACCESS_TOKEN_MINUTES default

function parseCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function getToken(): string | null {
  return parseCookie(TOKEN_KEY);
}

export function getUser(): { id: string; email: string } | null {
  const raw = parseCookie(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; email: string };
  } catch {
    return null;
  }
}

export function setAuth(
  token: string,
  user: { id: string; email: string },
): void {
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
  document.cookie = `${USER_KEY}=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearAuth(): void {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${USER_KEY}=; path=/; max-age=0`;
}

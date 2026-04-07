import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const locales = ["en", "fr"] as const;
const defaultLocale = "en";

function pathnameHasLocale(pathname: string) {
  return locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes must stay unlocalized (/api/*), otherwise they become /{locale}/api/* and 404.
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (pathnameHasLocale(pathname)) {
    const locale = pathname.split("/")[1] || defaultLocale;
    const res = NextResponse.next();
    res.headers.set("x-locale", locale);
    return res;
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
  }

  let path = pathname;
  if (path === "/incidents") path = "/dashboard/incidents";
  if (path === "/site-health") path = "/dashboard/site-health";

  return NextResponse.redirect(new URL(`/${defaultLocale}${path}`, request.url));
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasCookie = request.cookies.has("access_token");

  if (!hasCookie && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // /api/* is the rewrite proxy to the backend (see next.config.ts) — it must pass
  // through untouched. This guard only applies to actual page navigations.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};

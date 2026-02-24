import { UserRole } from "@prisma/client";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const requiresAuth = pathname.startsWith("/dashboard") || pathname.startsWith("/api/private");

  if (!requiresAuth) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/dashboard/candidate") && token.role !== UserRole.CANDIDATE) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard/company") && token.role !== UserRole.COMPANY) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/api/private/company") && token.role !== UserRole.COMPANY) {
    return NextResponse.json({ error: "Unzureichende Berechtigung." }, { status: 403 });
  }

  if (pathname.startsWith("/api/private/candidate") && token.role !== UserRole.CANDIDATE) {
    return NextResponse.json({ error: "Unzureichende Berechtigung." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/private/:path*"],
};

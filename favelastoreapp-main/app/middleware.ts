import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const code = request.nextUrl.searchParams.get("code");
  if (path === "/admin/produtos/ebay-callback" && code) {
    const newUrl = new URL("/admin/ebay-callback", request.url);
    newUrl.search = request.nextUrl.search;
    return NextResponse.redirect(newUrl);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

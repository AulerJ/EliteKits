import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          const week = 60 * 60 * 24 * 7;
          cookiesToSet.forEach(({ name, value, options }) => {
            const isAuth = name.startsWith("sb-");
            supabaseResponse.cookies.set(name, value, {
              ...(options as object),
              path: "/",
              sameSite: "lax",
              ...(isAuth ? { maxAge: week * 4 } : {}), // 4 semanas para manter admin logado ao fechar/abrir app
            });
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}

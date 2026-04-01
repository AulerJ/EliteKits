import Link from "next/link";
import { LogIn, ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/admin/produtos");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold text-zinc-900">
          Painel Administrativo
        </h1>
        <p className="mt-2 text-center text-zinc-600">
          Faça login para gerenciar produtos.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/admin/login"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-green-600 px-6 py-4 font-semibold text-white transition hover:bg-green-500"
          >
            <LogIn className="h-5 w-5" />
            Entrar
          </Link>
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-6 py-4 font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar
          </Link>
        </div>
      </div>
    </main>
  );
}

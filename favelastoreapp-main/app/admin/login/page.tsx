"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Loader2, Settings } from "lucide-react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { siteDisplayName } from "@/lib/site-brand";

export default function AdminLoginPage() {
  const brand = siteDisplayName();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!hasSupabaseConfig()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <div className="mb-4 flex justify-center">
            <Settings className="h-12 w-12 text-amber-600" />
          </div>
          <h2 className="text-center text-xl font-bold text-zinc-900">
            Configuração necessária
          </h2>
          <p className="mt-3 text-center text-sm text-zinc-700">
            Crie o arquivo <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code> na
            raiz do projeto com as credenciais do Supabase.
          </p>
          <div className="mt-4 rounded-lg bg-white p-4 font-mono text-xs text-zinc-600">
            <p>NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co</p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...</p>
          </div>
          <p className="mt-4 text-center text-sm text-zinc-600">
            Pegue os valores em: Supabase Dashboard → Settings → API
          </p>
          <p className="mt-2 text-center text-sm text-zinc-600">
            Veja o guia em <code className="rounded bg-amber-100 px-1">docs/SETUP_SUPABASE.md</code>
          </p>
          <Link
            href="/admin"
            className="mt-6 block text-center text-green-600 hover:underline"
          >
            ← Voltar
          </Link>
        </div>
      </main>
    );
  }

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Redirecionamento completo para o servidor receber os cookies e manter a sessão (incl. ao abrir do home screen)
      window.location.href = "/admin/produtos";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100">
              <LogIn className="h-7 w-7 text-green-600" />
            </div>
          </div>
          <h1 className="text-center text-2xl font-bold text-zinc-900">
            Admin – {brand}
          </h1>
          <p className="mt-2 text-center text-zinc-600">
            Entre com email e senha
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Crie um usuário em Authentication &gt; Users no Supabase
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-600 py-2.5 font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <Link
            href="/admin"
            className="mt-6 block text-center text-sm text-zinc-500 hover:text-zinc-700"
          >
            ← Voltar
          </Link>
        </div>
      </div>
    </main>
  );
}

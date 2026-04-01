import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Crie o arquivo .env.local na raiz do projeto com:\n\nNEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key\n\nCopie de .env.example e pegue os valores em: Supabase Dashboard > Settings > API"
    );
  }
  return createBrowserClient(url, key);
}

export function hasSupabaseConfig() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

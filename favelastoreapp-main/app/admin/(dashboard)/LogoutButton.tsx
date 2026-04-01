"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
    >
      <LogOut className="h-4 w-4" />
      Sair
    </button>
  );
}

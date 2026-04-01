"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Se tiver categoria: "Voltar para: [Nome da categoria]" e link para a página da categoria.
 * Senão: "Voltar" e usa histórico (ou catálogo).
 */
export function BackToPrevious({
  categoryName,
  categoryHref,
}: {
  categoryName?: string | null;
  categoryHref?: string | null;
}) {
  const router = useRouter();
  const href = categoryHref?.trim();
  const name = categoryName?.trim();
  const hasCategory = name && href;

  if (hasCategory && href) {
    return (
      <Link
        href={href}
        className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        ← Voltar para: {name}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
    >
      ← Voltar
    </button>
  );
}

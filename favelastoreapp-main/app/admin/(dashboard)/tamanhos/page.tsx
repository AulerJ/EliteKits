import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ categoria?: string }>;
}

export default async function TamanhosPage({ searchParams }: PageProps) {
  const { categoria } = await searchParams;
  const url = categoria
    ? `/admin/produtos?categoria=${encodeURIComponent(categoria)}`
    : "/admin/produtos";
  redirect(url);
}

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, RefreshCw, Loader2, ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  subcategoryId: string;
  subcategoryName: string;
  parentCategoryId: string;
  parentCategoryName: string;
};

type Subgroup = { subcategoryId: string; subcategoryName: string; products: Product[] };
type ParentGroup = { parentCategoryId: string; parentCategoryName: string; subgroups: Subgroup[] };

function groupByParentThenSubcategory(products: Product[]): ParentGroup[] {
  const byParent = new Map<string, { parentName: string; bySub: Map<string, { subName: string; products: Product[] }> }>();

  for (const p of products) {
    const parentId = p.parentCategoryId || "__none__";
    const parentName = p.parentCategoryName || "Sem categoria";
    if (!byParent.has(parentId)) {
      byParent.set(parentId, { parentName, bySub: new Map() });
    }
    const parent = byParent.get(parentId)!;

    const subId = p.subcategoryId || "__none__";
    const subName = p.subcategoryName || parentName;
    if (!parent.bySub.has(subId)) {
      parent.bySub.set(subId, { subName, products: [] });
    }
    parent.bySub.get(subId)!.products.push(p);
  }

  return Array.from(byParent.entries()).map(([parentCategoryId, { parentName, bySub }]) => ({
    parentCategoryId: parentCategoryId === "__none__" ? "" : parentCategoryId,
    parentCategoryName: parentName,
    subgroups: Array.from(bySub.entries()).map(([subcategoryId, { subName, products }]) => ({
      subcategoryId: subcategoryId === "__none__" ? "" : subcategoryId,
      subcategoryName: subName,
      products,
    })),
  }));
}

export default function EbaySyncPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [priceIncreaseDollars, setPriceIncreaseDollars] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set());
  const [locationsHint, setLocationsHint] = useState<string | null>(null);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<{ ok: boolean; checks: { name: string; ok: boolean; message: string }[] } | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  const parentGroups = useMemo(() => groupByParentThenSubcategory(products), [products]);

  useEffect(() => {
    fetch("/api/ebay-sync")
      .then((r) => r.json())
      .then((data) => {
        if (data.products) {
          setProducts(data.products);
          setSelected(new Set(data.products.map((p: Product) => p.id)));
          const groups = groupByParentThenSubcategory(data.products);
          setCollapsedParents(new Set(groups.map((g) => g.parentCategoryId)));
          setCollapsedSubs(new Set(groups.flatMap((g) => g.subgroups.map((s) => `${g.parentCategoryId}-${s.subcategoryId}`))));
        } else setError(data.error || "Erro ao carregar produtos");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(products.map((p) => p.id)) : new Set());
  }

  function toggleParent(parentId: string, checked: boolean) {
    const group = parentGroups.find((g) => g.parentCategoryId === parentId);
    if (!group) return;
    const ids = group.subgroups.flatMap((s) => s.products.map((p) => p.id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function toggleSubcategory(parentId: string, subId: string, checked: boolean) {
    const group = parentGroups.find((g) => g.parentCategoryId === parentId);
    const subgroup = group?.subgroups.find((s) => s.subcategoryId === subId);
    if (!subgroup) return;
    setSelected((prev) => {
      const next = new Set(prev);
      subgroup.products.forEach((p) => (checked ? next.add(p.id) : next.delete(p.id)));
      return next;
    });
  }

  function isParentFullySelected(parentId: string): boolean {
    const group = parentGroups.find((g) => g.parentCategoryId === parentId);
    if (!group) return false;
    const ids = group.subgroups.flatMap((s) => s.products.map((p) => p.id));
    return ids.length > 0 && ids.every((id) => selected.has(id));
  }

  function isParentPartiallySelected(parentId: string): boolean {
    const group = parentGroups.find((g) => g.parentCategoryId === parentId);
    if (!group) return false;
    const ids = group.subgroups.flatMap((s) => s.products.map((p) => p.id));
    const count = ids.filter((id) => selected.has(id)).length;
    return count > 0 && count < ids.length;
  }

  function isSubFullySelected(parentId: string, subId: string): boolean {
    const subgroup = parentGroups.find((g) => g.parentCategoryId === parentId)?.subgroups.find((s) => s.subcategoryId === subId);
    if (!subgroup || !subgroup.products.length) return false;
    return subgroup.products.every((p) => selected.has(p.id));
  }

  function isSubPartiallySelected(parentId: string, subId: string): boolean {
    const subgroup = parentGroups.find((g) => g.parentCategoryId === parentId)?.subgroups.find((s) => s.subcategoryId === subId);
    if (!subgroup) return false;
    const count = subgroup.products.filter((p) => selected.has(p.id)).length;
    return count > 0 && count < subgroup.products.length;
  }

  function toggleParentCollapse(parentId: string) {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  function toggleSubCollapse(subKey: string) {
    setCollapsedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(subKey)) next.delete(subKey);
      else next.add(subKey);
      return next;
    });
  }

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    setError(null);
    setSyncErrors([]);
    try {
      const productIds = Array.from(selected);
      const dollars = priceIncreaseDollars.trim() ? parseFloat(priceIncreaseDollars) : undefined;
      const res = await fetch("/api/ebay-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: productIds.length ? productIds : undefined,
          priceIncreaseAmount: dollars != null && !Number.isNaN(dollars) ? dollars : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Erro ao sincronizar");
        return;
      }
      if (data.message) setError(data.message);
      const okCount = data.results?.filter((r: { ok: boolean }) => r.ok).length ?? 0;
      const total = data.results?.length ?? 0;
      const skipped = (data.results ?? []).filter((r: { skipped?: boolean }) => r.skipped).length;
      let msg = `${okCount}/${total} produtos sincronizados com o eBay.`;
      if (skipped > 0) msg += ` ${skipped} produto(s) sem imagem ignorado(s).`;
      setMessage(msg);
      const errs = (data.results ?? [])
        .filter((r: { ok: boolean; error?: string }) => !r.ok && r.error)
        .map((r: { sku: string; error?: string }) => `${r.sku}: ${r.error}`);
      if (errs.length) setSyncErrors(errs.slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/produtos"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar aos produtos
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900">Sincronizar com o eBay</h1>
      <p className="mt-1 text-zinc-600">
        Escolha por categoria e subcategoria. Marque a categoria (ex: Camisas) para selecionar tudo junto.
      </p>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">Ainda não configurou o eBay?</p>
        <p className="mt-1 text-sm text-amber-800">
          Coloque as credenciais no .env e obtenha o <strong>Refresh Token</strong> em um clique.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/ebay-callback"
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 underline hover:text-amber-900"
          >
            Obter Refresh Token (guia passo a passo)
          </Link>
          <button
            type="button"
            disabled={locationsLoading}
            onClick={async () => {
              setLocationsLoading(true);
              setLocationsHint(null);
              try {
                const r = await fetch("/api/ebay-locations");
                const d = await r.json();
                if (d.locations?.length) {
                  setLocationsHint(`Locais na sua conta: ${d.locations.map((l: { merchantLocationKey: string }) => l.merchantLocationKey).join(", ")}. ${d.hint || ""}`);
                } else {
                  setLocationsHint(d.hint || d.error || "Nenhum local. A sincronização tentará criar o local 'default'.");
                }
              } catch (e) {
                setLocationsHint("Erro ao listar locais. " + (e instanceof Error ? e.message : ""));
              } finally {
                setLocationsLoading(false);
              }
            }}
            className="text-sm font-medium text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
          >
            {locationsLoading ? "Carregando…" : "Ver locais de estoque eBay"}
          </button>
          <button
            type="button"
            disabled={diagnosticLoading}
            onClick={async () => {
              setDiagnosticLoading(true);
              setDiagnostic(null);
              try {
                const r = await fetch("/api/ebay-diagnostic");
                const d = await r.json();
                setDiagnostic(d);
              } catch (e) {
                setDiagnostic({ ok: false, checks: [{ name: "Erro", ok: false, message: e instanceof Error ? e.message : "Falha ao verificar" }] });
              } finally {
                setDiagnosticLoading(false);
              }
            }}
            className="text-sm font-medium text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
          >
            {diagnosticLoading ? "Verificando…" : "Verificar configuração"}
          </button>
          <Link
            href="/admin/ebay-troubleshooting"
            className="text-sm font-medium text-amber-700 underline hover:text-amber-900"
          >
            Erro 500? Guia de troubleshooting
          </Link>
        </div>
        {locationsHint && (
          <p className="mt-3 rounded border border-amber-300 bg-amber-100/80 p-2 text-xs text-amber-900">{locationsHint}</p>
        )}
        {diagnostic && (
          <div className="mt-3 rounded border border-amber-300 bg-amber-100/80 p-3">
            <p className="text-xs font-medium text-amber-900">
              {diagnostic.ok ? "✓ Configuração OK" : "⚠ Revise os itens em vermelho"}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-amber-900">
              {diagnostic.checks?.map((c, i) => (
                <li key={i} className={c.ok ? "" : "font-medium text-red-700"}>
                  {c.ok ? "✓" : "✗"} {c.name}: {c.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="block text-sm font-medium text-zinc-700">Aumentar preço no eBay (US$)</label>
        <input
          type="number"
          min="0"
          step="0.5"
          placeholder="Ex: 5 (para +US$ 5)"
          value={priceIncreaseDollars}
          onChange={(e) => setPriceIncreaseDollars(e.target.value)}
          className="mt-1 w-full max-w-[140px] rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">Deixe em branco para usar o mesmo preço do site.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 font-medium text-zinc-800">
          <input
            type="checkbox"
            checked={products.length > 0 && selected.size === products.length}
            onChange={(e) => toggleAll(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Selecionar todos os produtos
        </label>
        <span className="text-sm text-zinc-600">
          {selected.size} de {products.length} selecionados · {parentGroups.length} categorias
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {parentGroups.map((parent) => {
          const parentOpen = !collapsedParents.has(parent.parentCategoryId);
          const parentFull = isParentFullySelected(parent.parentCategoryId);
          const parentPartial = isParentPartiallySelected(parent.parentCategoryId);
          const totalInParent = parent.subgroups.reduce((acc, s) => acc + s.products.length, 0);

          return (
            <section
              key={parent.parentCategoryId || "none"}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              <div
                className="flex cursor-pointer items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-4 py-3 transition hover:bg-zinc-100/80"
                onClick={() => toggleParentCollapse(parent.parentCategoryId)}
              >
                <label className="flex flex-1 cursor-pointer items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={parentFull}
                    ref={(el) => {
                      if (el) el.indeterminate = parentPartial;
                    }}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleParent(parent.parentCategoryId, e.target.checked);
                    }}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  {parentOpen ? (
                    <FolderOpen className="h-5 w-5 text-zinc-600" />
                  ) : (
                    <Folder className="h-5 w-5 text-zinc-500" />
                  )}
                  <span className="font-semibold text-zinc-900">{parent.parentCategoryName}</span>
                  <span className="text-sm text-zinc-500">
                    ({totalInParent} produtos · {parent.subgroups.length} subcategorias)
                  </span>
                </label>
                <button type="button" className="p-1 text-zinc-500 hover:text-zinc-700" aria-label={parentOpen ? "Recolher" : "Expandir"}>
                  {parentOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
              </div>

              {parentOpen && (
                <div className="border-t border-zinc-100">
                  {parent.subgroups.map((sub) => {
                    const subKey = `${parent.parentCategoryId}-${sub.subcategoryId}`;
                    const subOpen = !collapsedSubs.has(subKey);
                    const subFull = isSubFullySelected(parent.parentCategoryId, sub.subcategoryId);
                    const subPartial = isSubPartiallySelected(parent.parentCategoryId, sub.subcategoryId);

                    return (
                      <div key={subKey} className="border-b border-zinc-50 last:border-b-0">
                        <div
                          className="flex cursor-pointer items-center justify-between bg-white px-4 py-2.5 pl-10 hover:bg-zinc-50/50"
                          onClick={() => toggleSubCollapse(subKey)}
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={subFull}
                              ref={(el) => {
                                if (el) el.indeterminate = subPartial;
                              }}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSubcategory(parent.parentCategoryId, sub.subcategoryId, e.target.checked);
                              }}
                              className="h-4 w-4 rounded border-zinc-300"
                            />
                            <span className="font-medium text-zinc-800">{sub.subcategoryName}</span>
                            <span className="text-sm text-zinc-500">
                              ({sub.products.length} {sub.products.length === 1 ? "produto" : "produtos"})
                            </span>
                          </label>
                          <button type="button" className="p-1 text-zinc-400 hover:text-zinc-600">
                            {subOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </div>

                        {subOpen && (
                          <ul className="divide-y divide-zinc-50 bg-zinc-50/30">
                            {sub.products.map((p) => (
                              <li
                                key={p.id}
                                className="flex cursor-pointer items-center justify-between px-4 py-2 pl-16 hover:bg-white/60"
                                onClick={() => toggle(p.id)}
                              >
                                <label className="flex flex-1 cursor-pointer items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selected.has(p.id)}
                                    onChange={() => toggle(p.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4 w-4 rounded border-zinc-300"
                                  />
                                  <span className="text-zinc-900">{p.name || `Produto ${p.id.slice(0, 8)}`}</span>
                                </label>
                                <span className="text-sm font-medium text-green-600">US$ {Number(p.price).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {products.length === 0 && <p className="mt-6 text-center text-zinc-500">Nenhum produto ativo no site.</p>}

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-6">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || selected.size === 0}
          className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-5 py-2.5 font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
        >
          {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sincronizar {selected.size} produto(s) com o eBay
        </button>
        {message && <span className="text-sm text-green-700">{message}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
        {syncErrors.length > 0 && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">Erros do eBay (até 5):</p>
            <ul className="mt-1 list-inside list-disc text-xs text-red-700">
              {syncErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

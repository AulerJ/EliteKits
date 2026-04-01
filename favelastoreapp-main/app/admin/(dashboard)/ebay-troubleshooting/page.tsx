import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "eBay – Resolver erro 500 / 25002",
  description: "Checklist para corrigir erros ao sincronizar com o eBay.",
};

export default function EbayTroubleshootingPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/admin/produtos/ebay-sync"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar à sincronização eBay
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900">
        Resolver erro 500 / 25002 ao sincronizar com o eBay
      </h1>
      <p className="mt-2 text-zinc-600">
        Se você recebe &quot;Erro 500 do eBay (System error)&quot; ou errorId 25002 ao publicar ofertas, siga este checklist na ordem.
      </p>

      <div className="mt-8 space-y-8 text-sm">
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-900">1. Sandbox vs Produção (muito comum)</h2>
          <p className="mt-2 text-zinc-600">
            O sandbox do eBay é instável. Erros 500 e 25002 costumam sumir ao usar produção.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-zinc-700">
            <li>No .env.local, mude para: <code className="rounded bg-zinc-100 px-1">EBAY_ENV=production</code></li>
            <li>No <a href="https://developer.ebay.com" target="_blank" rel="noopener noreferrer" className="text-green-600 underline">eBay Developer Portal</a>, cadastre a RuName de produção.</li>
            <li>Gere um novo Refresh Token em produção (Admin → Obter Refresh Token).</li>
            <li>Atualize EBAY_REFRESH_TOKEN no .env com o token de produção.</li>
            <li>Reinicie o servidor / faça novo deploy.</li>
          </ol>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-900">2. Política de envio (Fulfillment) – obrigatório</h2>
          <p className="mt-2 text-zinc-600">
            A política de envio precisa ter ao menos um serviço de envio configurado (ex.: Flat rate, USPS).
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-zinc-700">
            <li>Seller Hub → Configurações → Business policies.</li>
            <li>Abra a política de Fulfillment cujo ID está em EBAY_FULFILLMENT_POLICY_ID.</li>
            <li>Adicione ao menos um serviço de envio, se não houver.</li>
            <li>Salve.</li>
          </ol>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-900">3. Política de devolução (Return)</h2>
          <p className="mt-2 text-zinc-600">
            A política de devolução precisa estar configurada (não pode estar vazia).
          </p>
          <p className="mt-2 text-zinc-700">
            Seller Hub → Business policies → Return policy → Abra a política em EBAY_RETURN_POLICY_ID → Defina e salve.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-900">4. Local de estoque (Inventory location)</h2>
          <p className="mt-2 text-zinc-600">
            O local precisa ter endereço completo, incluindo país.
          </p>
          <p className="mt-2 text-zinc-700">
            Seller Hub → Account → Inventory locations → Abra o local em EBAY_MERCHANT_LOCATION_KEY → Preencha Country, Address, City, State, Postal code → Salve.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-900">5. Categoria (EBAY_CATEGORY_ID)</h2>
          <p className="mt-2 text-zinc-600">
            Use uma categoria folha válida. Ex.: 11450 (Men&apos;s Clothing), 53159 (Men&apos;s Shirts).
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-900">6. Imagem do produto</h2>
          <p className="mt-2 text-zinc-600">
            O eBay exige ao menos uma imagem. Produtos sem imagem são ignorados na sincronização.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-900">Resumo rápido</h2>
          <ul className="mt-2 space-y-1 text-zinc-700">
            <li>• EBAY_ENV=production (evita bugs do sandbox)</li>
            <li>• Fulfillment com shipping → Seller Hub → Business policies</li>
            <li>• Return policy configurada</li>
            <li>• Local com endereço completo → Inventory locations</li>
            <li>• Categoria folha válida no .env</li>
          </ul>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">Ainda não funcionou?</h2>
          <p className="mt-2 text-amber-800">
            Espere alguns minutos (erros 500 às vezes são temporários). Tente com 1 produto só. Abra um caso no{" "}
            <a href="https://developer.ebay.com/support" target="_blank" rel="noopener noreferrer" className="underline">
              eBay Developer Support
            </a>{" "}
            com errorId 25002 e a mensagem completa.
          </p>
        </section>
      </div>
    </main>
  );
}

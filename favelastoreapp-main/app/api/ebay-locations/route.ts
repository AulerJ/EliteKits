import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEbayLocations } from "@/lib/ebay/sync";

/** Lista os locais de estoque da conta eBay (para configurar EBAY_MERCHANT_LOCATION_KEY). */
export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado. Faça login no admin." }, { status: 401 });
  }

  const result = await getEbayLocations();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, locations: [] },
      { status: 400 }
    );
  }

  return NextResponse.json({
    locations: result.locations,
    hint: result.locations.length
      ? `Use EBAY_MERCHANT_LOCATION_KEY=${result.locations[0].merchantLocationKey} no .env (ou outro da lista).`
      : "Nenhum local. Crie um no Seller Hub do eBay ou a sincronização tentará criar 'default'.",
  });
}

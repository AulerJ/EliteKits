import { NextRequest, NextResponse } from "next/server";
import { getEbayAuthUrl, getEbayConsentUrl } from "@/lib/ebay/config";

export async function GET() {
  const consentUrl = getEbayConsentUrl();
  if (!consentUrl) {
    return NextResponse.json(
      { error: "Configure EBAY_CLIENT_ID e EBAY_REDIRECT_URI no .env. Veja docs/EBAY_SETUP.md." },
      { status: 400 }
    );
  }

  return NextResponse.json({ consentUrl });
}

export async function POST(req: NextRequest) {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const redirectUri = process.env.EBAY_RUNAME || process.env.EBAY_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Configure EBAY_CLIENT_ID, EBAY_CLIENT_SECRET e EBAY_RUNAME (ou EBAY_REDIRECT_URI) no .env. Para eBay use o RuName do portal, não a URL." },
      { status: 400 }
    );
  }

  let body: { code?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Parâmetro 'code' obrigatório." }, { status: 400 });
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(getEbayAuthUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `eBay rejeitou o code: ${res.status} ${text.slice(0, 300)}` },
      { status: 400 }
    );
  }

  const data = (await res.json()) as { refresh_token?: string; access_token?: string };
  const refreshToken = data.refresh_token;
  if (!refreshToken) {
    return NextResponse.json({ error: "eBay não retornou refresh_token." }, { status: 400 });
  }

  return NextResponse.json({ refresh_token: refreshToken });
}

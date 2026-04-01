import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * Rota para testar se o email está funcionando (Resend + STORE_OWNER_EMAIL).
 * Uso: GET /api/test-email?secret=SEU_EMAIL_TEST_SECRET
 * No Vercel, crie a variável EMAIL_TEST_SECRET com um valor qualquer (ex: teste123).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.EMAIL_TEST_SECRET;
  const storeOwnerEmail = process.env.STORE_OWNER_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!expected || secret !== expected) {
    return NextResponse.json(
      { error: "Acesso negado. Defina EMAIL_TEST_SECRET no Vercel e use ?secret=valor" },
      { status: 403 }
    );
  }

  if (!storeOwnerEmail) {
    return NextResponse.json(
      { error: "STORE_OWNER_EMAIL não está definido no Vercel." },
      { status: 500 }
    );
  }

  if (!resendApiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY não está definido no Vercel." },
      { status: 500 }
    );
  }

  const resend = new Resend(resendApiKey);
  const from = process.env.RESEND_FROM_EMAIL ?? "Favela Store <onboarding@resend.dev>";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [storeOwnerEmail],
      subject: "Teste Favela Store – email está funcionando",
      html: `
        <p>Se você recebeu este email, o Resend e as variáveis no Vercel estão corretos.</p>
        <p>Os emails de <strong>novo pedido</strong> devem chegar em ${storeOwnerEmail} quando alguém comprar.</p>
        <p>Favela Store</p>
      `,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Email de teste enviado para ${storeOwnerEmail}. Verifique a caixa de entrada e o spam.`,
      id: data?.id,
    });
  } catch (err) {
    console.error("Test email error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro ao enviar" },
      { status: 500 }
    );
  }
}

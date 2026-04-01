/** Nome exibido no site. Sobrescreva com NEXT_PUBLIC_SITE_NAME no Vercel (ex.: EliteKits). */
export function siteDisplayName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "EliteKits";
}

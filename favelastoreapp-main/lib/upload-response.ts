/**
 * Faz parse da resposta do /api/upload de forma segura.
 * Quando o servidor retorna erro em texto (ex.: 413 Request Entity Too Large),
 * evita "Unexpected token ... is not valid JSON" e devolve mensagem clara.
 */
export async function parseUploadResponse(
  res: Response
): Promise<{ url?: string; storage_path?: string; error?: string }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as { url?: string; error?: string };
  } catch {
    if (/Request Entity Too Large|Payload Too Large|413|too large/i.test(text)) {
      return { error: "Arquivo muito grande. Use no máximo 10 MB (JPG, PNG, GIF ou WebP)." };
    }
    return {
      error:
        "Resposta inválida do servidor. Use uma imagem real (JPG, PNG, GIF ou WebP). Arquivos do Google Drive: baixe a imagem, não use atalho.",
    };
  }
}

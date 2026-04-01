import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@/lib/supabase/server";

function normalizeEnv(v: string | undefined): string {
  return (v ?? "").trim();
}

/** Evita usar Cloudinary quando o .env ainda tem placeholders do .env.example */
function isRealCloudinaryConfig(
  cloudName: string,
  apiKey: string,
  apiSecret: string
): boolean {
  if (!cloudName || !apiKey || !apiSecret) return false;
  const lower = `${cloudName} ${apiKey} ${apiSecret}`.toLowerCase();
  if (
    lower.includes("seu_cloud_name") ||
    lower.includes("sua_api_key") ||
    lower.includes("seu_api_secret")
  ) {
    return false;
  }
  return true;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande. Use no máximo ${MAX_SIZE_MB} MB.` },
      { status: 400 }
    );
  }

  const cloudName = normalizeEnv(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = normalizeEnv(process.env.CLOUDINARY_API_KEY);
  const apiSecret = normalizeEnv(process.env.CLOUDINARY_API_SECRET);
  const useCloudinary = isRealCloudinaryConfig(cloudName, apiKey, apiSecret);

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Detectar tipo de imagem: magic bytes, depois extensão/nome, depois tenta como JPEG
    let mimeType = file.type;
    if (!mimeType || mimeType === "application/octet-stream" || mimeType === "file") {
      const header = buffer.slice(0, 12);
      if (header[0] === 0xff && header[1] === 0xd8) {
        mimeType = "image/jpeg";
      } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
        mimeType = "image/png";
      } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
        mimeType = "image/gif";
      } else if (header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
        mimeType = "image/webp";
      } else if (header[0] === 0x42 && header[1] === 0x4d) {
        mimeType = "image/bmp";
      } else if (header[0] === 0x3c || header[0] === 0x25) {
        return NextResponse.json(
          { error: "Arquivo não é uma imagem (pode ser página HTML ou PDF). No Google Drive, abra a imagem e use “Fazer download” nela." },
          { status: 400 }
        );
      } else {
        const name = (file.name || "").toLowerCase();
        if (name.endsWith(".png")) mimeType = "image/png";
        else if (name.endsWith(".gif")) mimeType = "image/gif";
        else if (name.endsWith(".webp")) mimeType = "image/webp";
        else if (name.endsWith(".bmp")) mimeType = "image/bmp";
        else mimeType = "image/jpeg";
      }
    }

    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Arquivo não é uma imagem. Use JPG, PNG, GIF ou WebP." },
        { status: 400 }
      );
    }

    if (useCloudinary) {
      const base64 = buffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64}`;
      const folder = (formData.get("folder") as string) || "favelastore";
      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: "image",
        quality: "auto",
        fetch_format: "auto",
      });
      if (!result?.secure_url) throw new Error("Upload sem URL");
      return NextResponse.json({ url: result.secure_url, storage_path: (result as { public_id?: string }).public_id || result.secure_url });
    }

    // Fallback: Supabase Storage (quando Cloudinary não está configurado)
    const folder = (formData.get("folder") as string) || "favelastore";
    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : mimeType === "image/bmp" ? "bmp" : "gif";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const path = `${folder}/${name}`;
    const bucket = "favelastore_products";

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      console.error("Supabase storage upload error:", error);
      return NextResponse.json(
        {
          error:
            error.message === "Bucket not found"
              ? "Crie o bucket no Supabase: Storage > New bucket > nome 'favelastore_products' (Public)."
              : error.message || "Erro ao enviar a imagem.",
        },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!baseUrl) {
      return NextResponse.json({ error: "NEXT_PUBLIC_SUPABASE_URL não definida" }, { status: 500 });
    }
    const url = `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
    return NextResponse.json({ url, storage_path: path });
  } catch (err) {
    console.error("Upload error:", err);
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : (() => {
              try {
                return JSON.stringify(err);
              } catch {
                return "Erro desconhecido no upload";
              }
            })();
    return NextResponse.json(
      {
        error:
          message ||
          "Erro no upload. Confira Cloudinary no .env ou o bucket Supabase favelastore_products.",
      },
      { status: 500 }
    );
  }
}

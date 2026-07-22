import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { hasDatabase } from "@/db/client.server";
import { readMediaAsset } from "@/lib/media.server";

const idSchema = z.string().uuid();

export const Route = createFileRoute("/api/media/$id")({
  server: { handlers: {
    GET: async ({ params, request }) => {
      const id = idSchema.safeParse(params.id);
      if (!id.success || !hasDatabase()) return new Response("Imagem não encontrada.", { status: 404 });
      const media = await readMediaAsset(id.data);
      if (!media) return new Response("Imagem não encontrada.", { status: 404 });
      const etag = `"${media.sha256}"`;
      if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
      return new Response(new Uint8Array(media.bytes), {
        headers: {
          "Content-Type": media.contentType,
          "Content-Length": String(media.size),
          "Content-Disposition": `inline; filename="${media.filename}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
          ETag: etag,
        },
      });
    },
  } },
});


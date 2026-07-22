import { useId, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  maxDimension?: number;
};

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Arquivo de imagem inválido."));
    image.src = source;
  });
}

async function optimizeImage(file: File, maxDimension: number) {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > 12 * 1024 * 1024) throw new Error("A imagem original deve ter no máximo 12 MB.");
  const originalUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(originalUrl);
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Seu navegador não conseguiu processar a imagem.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.84;
    let blob: Blob | null = null;
    do {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      quality -= 0.08;
    } while (blob && blob.size > 420_000 && quality >= 0.44);
    if (!blob) throw new Error("Não foi possível converter a imagem.");
    if (blob.size > 650_000) throw new Error("A imagem ficou grande demais. Escolha outra com menos detalhes.");
    return blob;
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

export function ImageUploadField({ label = "Imagem", value, onChange, help, maxDimension = 1400 }: Props) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const optimized = await optimizeImage(file, maxDimension);
      const form = new FormData();
      form.append("file", optimized, `${file.name.replace(/\.[^.]+$/, "") || "imagem"}.webp`);
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { "x-csrf-token": sessionStorage.getItem("ago-admin-csrf") || "" },
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) throw new Error(payload?.error || "Não foi possível enviar a imagem.");
      onChange(payload.url);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao processar imagem."); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      {value && <div className="relative aspect-[16/9] max-h-52 overflow-hidden rounded-2xl border bg-muted"><img src={value} alt="Prévia" className="h-full w-full object-cover" /><Button type="button" size="icon" variant="destructive" className="absolute right-2 top-2" aria-label="Remover imagem" onClick={() => onChange("")}><Trash2 className="h-4 w-4" /></Button></div>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-bold hover:bg-muted">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{busy ? "Otimizando..." : "Enviar arquivo"}</label>
        <Input value={value.startsWith("data:") ? "Imagem antiga incorporada" : value} onChange={(event) => onChange(event.target.value)} placeholder="ou cole uma URL https://" disabled={value.startsWith("data:")} />
      </div>
      <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <p className="text-xs text-muted-foreground">{help || "JPG, PNG ou WebP. A imagem é comprimida e armazenada como arquivo no PostgreSQL/Neon."}</p>
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, CloudUpload, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminData, useAdminStore } from "@/store/admin-store";

type PublishStatus = "dirty" | "publishing" | "published" | "error";

export function AdminPublishButton() {
  const [status, setStatus] = useState<PublishStatus>("dirty");
  const [message, setMessage] = useState("Alterações ainda não publicadas");

  useEffect(
    () =>
      useAdminStore.subscribe(() => {
        setStatus((current) => (current === "publishing" ? current : "dirty"));
        setMessage("Alterações ainda não publicadas");
      }),
    [],
  );

  const publish = async () => {
    setStatus("publishing");
    setMessage("Publicando para os clientes...");

    try {
      const response = await fetch("/api/admin-state", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": sessionStorage.getItem("ago-admin-csrf") || "",
        },
        body: JSON.stringify({ data: getAdminData() }),
      });
      const payload = (await response.json()) as { error?: string; updatedAt?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível publicar.");

      setStatus("published");
      setMessage("Publicado. Clientes recebem em até 3 segundos.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao publicar.");
    }
  };

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <Button onClick={publish} disabled={status === "publishing"} size="sm" className="gap-2">
        {status === "publishing" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : status === "published" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : status === "error" ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <CloudUpload className="h-4 w-4" />
        )}
        {status === "publishing" ? "Publicando" : "Publicar loja"}
      </Button>
      <span
        className={`max-w-56 truncate text-[10px] ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}
        title={message}
      >
        {message}
      </span>
    </div>
  );
}

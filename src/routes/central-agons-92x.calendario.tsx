import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export const Route = createFileRoute("/central-agons-92x/calendario")({ component: AdminCalendar });
type Day = {
  day: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  capacity: number;
  reserved: number;
  available: number;
  cutoffAt: string | null;
  note: string | null;
};
function AdminCalendar() {
  const [days, setDays] = useState<Day[]>([]);
  const [message, setMessage] = useState("");
  const load = () =>
    fetch("/api/delivery-calendar", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { days: Day[] }) => setDays(data.days || []));
  useEffect(() => {
    void load();
  }, []);
  const edit = (day: string, patch: Partial<Day>) =>
    setDays((current) => current.map((item) => (item.day === day ? { ...item, ...patch } : item)));
  async function save(day: Day) {
    const response = await fetch("/api/delivery-calendar", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": sessionStorage.getItem("ago-admin-csrf") || "",
      },
      body: JSON.stringify({
        day: day.day,
        deliveryEnabled: day.deliveryEnabled,
        pickupEnabled: day.pickupEnabled,
        capacity: Number(day.capacity),
        cutoffAt: day.cutoffAt ? new Date(day.cutoffAt).toISOString() : null,
        note: day.note,
      }),
    });
    setMessage(response.ok ? "Calendário atualizado." : "Não foi possível salvar.");
    if (response.ok) await load();
  }
  return (
    <div className="space-y-6">
      <header>
        <p className="section-kicker">Produção e agenda</p>
        <h1 className="font-display text-3xl">Calendário de atendimento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Abra ou feche datas, defina o prazo de corte e limite a quantidade de refeições produzidas
          por dia.
        </p>
      </header>
      {message && <p className="rounded-xl bg-green-soft p-3 text-sm text-secondary">{message}</p>}
      <div className="grid gap-4 xl:grid-cols-2">
        {days.map((day) => (
          <article key={day.day} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-bold">
                  <CalendarDays className="h-4 w-4 text-primary-dark" />
                  {new Date(`${day.day}T12:00:00`).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {day.reserved} reservadas · {day.available} disponíveis
                </p>
              </div>
              <Button size="sm" onClick={() => void save(day)}>
                <Save className="mr-1 h-4 w-4" />
                Salvar
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.deliveryEnabled}
                  onChange={(e) => edit(day.day, { deliveryEnabled: e.target.checked })}
                />
                Entrega
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.pickupEnabled}
                  onChange={(e) => edit(day.day, { pickupEnabled: e.target.checked })}
                />
                Retirada
              </label>
              <label>
                Capacidade
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  value={day.capacity}
                  onChange={(e) => edit(day.day, { capacity: Number(e.target.value) })}
                />
              </label>
              <label>
                Prazo de corte
                <Input
                  type="datetime-local"
                  value={day.cutoffAt ? day.cutoffAt.slice(0, 16) : ""}
                  onChange={(e) => edit(day.day, { cutoffAt: e.target.value || null })}
                />
              </label>
              <label className="col-span-2">
                Observação
                <Input
                  value={day.note || ""}
                  onChange={(e) => edit(day.day, { note: e.target.value })}
                  placeholder="Ex.: feriado ou produção especial"
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

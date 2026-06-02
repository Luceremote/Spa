"use client";

import { useState } from "react";
import { Loader2, BellRing, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface Props {
  serviceId: string;
  preferredDate?: string; // YYYY-MM-DD
  presetName?: string;
  presetPhone?: string;
  presetEmail?: string;
}

export function WaitlistCTA({ serviceId, preferredDate, presetName, presetPhone, presetEmail }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(presetName ?? "");
  const [phone, setPhone] = useState(presetPhone ?? "");
  const [email, setEmail] = useState(presetEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<"new" | "already" | null>(null);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api<{ alreadyOnList: boolean }>("/waitlist", {
        method: "POST",
        json: {
          customer: { name, phone, email: email || null },
          serviceId,
          preferredDate: preferredDate || null,
        },
      });
      setDone(r.alreadyOnList ? "already" : "new");
    } catch (e: any) {
      setError(e.message ?? "No se pudo anotar");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">
            {done === "already" ? "Ya estabas en la lista" : "¡Listo! Estás en la lista de espera"}
          </p>
          <p className="text-muted-foreground">
            Te avisaremos por email apenas se libere un cupo para este servicio.
          </p>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          ¿No encuentras un horario disponible?
        </p>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <BellRing className="h-4 w-4 mr-2" /> Avísame cuando se libere un cupo
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-medium flex items-center gap-2">
        <BellRing className="h-4 w-4 text-primary" /> Lista de espera
      </p>
      <div className="space-y-2">
        <Label htmlFor="wl-name">Nombre</Label>
        <Input id="wl-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="wl-phone">Teléfono</Label>
          <Input
            id="wl-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wl-email">Email (para avisarte)</Label>
          <Input
            id="wl-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !name || !phone || !email}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Anotarme
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

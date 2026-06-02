"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface Props {
  tierId: string;
  tierName: string;
}

export function SubscribeForm({ tierId, tierName }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await api<{ url: string }>("/memberships/subscribe", {
        method: "POST",
        json: {
          tierId,
          customer: { name: name.trim(), phone: phone.replace(/\D/g, ""), email: email.trim() },
        },
      });
      if (r.url) window.location.href = r.url;
    } catch (e: any) {
      setErr(e.message ?? "No se pudo iniciar la suscripción");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button className="w-full" onClick={() => setOpen(true)}>
        Suscribirme a {tierName}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Tu nombre</Label>
        <Input required value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Teléfono</Label>
        <Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
        Continuar al pago
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Cobro mensual automático. Puedes cancelar cuando quieras.
      </p>
    </form>
  );
}

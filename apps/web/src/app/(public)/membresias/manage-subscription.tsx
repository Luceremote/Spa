"use client";

import { useState } from "react";
import { Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export function ManageSubscription() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await api<{ url: string }>("/memberships/portal", {
        method: "POST",
        json: { phone: phone.replace(/\D/g, "") },
      });
      if (r.url) window.location.href = r.url;
    } catch (e: any) {
      setErr(e.message ?? "No encontramos tu suscripción");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
      >
        <Settings className="h-4 w-4" /> ¿Ya eres miembro? Gestiona tu suscripción
      </button>
    );
  }

  return (
    <form onSubmit={go} className="inline-flex flex-col sm:flex-row gap-2 items-center justify-center max-w-md mx-auto">
      <Input
        type="tel"
        placeholder="Tu teléfono"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        className="max-w-[220px]"
      />
      <Button type="submit" variant="outline" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
        Gestionar suscripción
      </Button>
      {err && <p className="text-xs text-destructive w-full">{err}</p>}
    </form>
  );
}

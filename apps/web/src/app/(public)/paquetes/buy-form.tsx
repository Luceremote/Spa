"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface Props {
  packageId: string;
  packageName: string;
}

export function BuyPackageForm({ packageId, packageName }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await api<{ url: string }>("/packages/buy", {
        method: "POST",
        json: {
          packageId,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.replace(/\D/g, ""),
        },
      });
      if (r.url) window.location.href = r.url;
    } catch (e: any) {
      setErr(e.message || "No se pudo iniciar la compra");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full">
        Comprar
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Tu nombre</Label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Email</Label>
        <Input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Teléfono</Label>
        <Input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
        />
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Pagar {packageName}
      </Button>
    </form>
  );
}

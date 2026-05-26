"use client";

import { useEffect, useState } from "react";
import { Loader2, Gift, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatMoney, formatDateTime } from "@/lib/utils";
import type { GiftCard } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  USED_UP: "bg-gray-100 text-gray-600",
  EXPIRED: "bg-red-100 text-red-800",
  REFUNDED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente pago",
  ACTIVE: "Activa",
  USED_UP: "Agotada",
  EXPIRED: "Expirada",
  REFUNDED: "Reembolsada",
  CANCELLED: "Cancelada",
};

export default function GiftCardsAdminPage() {
  const { toast } = useToast();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const path = filter ? `/gift-cards?status=${filter}` : "/gift-cards";
    const r = await api<{ giftCards: GiftCard[] }>(path, { token });
    setCards(r.giftCards);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [filter]);

  async function cancel(c: GiftCard) {
    if (!confirm(`¿Cancelar gift card ${c.code}? El saldo se perderá.`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/gift-cards/${c.id}`, {
        token,
        method: "PUT",
        json: { status: "CANCELLED" },
      });
      toast("Gift card cancelada", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const filtered = cards.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.purchaserEmail.toLowerCase().includes(q) ||
      c.recipientEmail?.toLowerCase().includes(q) ||
      c.purchaserName.toLowerCase().includes(q) ||
      c.recipientName?.toLowerCase().includes(q)
    );
  });

  const totalActive = cards
    .filter((c) => c.status === "ACTIVE")
    .reduce((s, c) => s + c.balanceCents, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Gift Cards</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Tarjetas de regalo compradas por clientes
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase">Saldo activo total</p>
            <p className="text-2xl font-bold text-primary mt-1">{formatMoney(totalActive)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {cards.filter((c) => c.status === "ACTIVE").length} cards activas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase">Vendidas (todas)</p>
            <p className="text-2xl font-bold mt-1">{cards.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase">Ingresos brutos</p>
            <p className="text-2xl font-bold mt-1">
              {formatMoney(
                cards
                  .filter((c) => c.status !== "PENDING_PAYMENT" && c.status !== "CANCELLED")
                  .reduce((s, c) => s + c.initialCents, 0)
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activas</option>
          <option value="USED_UP">Agotadas</option>
          <option value="PENDING_PAYMENT">Pendientes</option>
          <option value="EXPIRED">Expiradas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Sin gift cards aún.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {filtered.map((c) => (
              <div key={c.id} className="p-4 hover:bg-muted/30">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <code className="font-mono font-semibold text-sm sm:text-base">{c.code}</code>
                    <span
                      className={`ml-2 text-[10px] px-2 py-0.5 rounded ${STATUS_COLORS[c.status] ?? ""}`}
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(c.balanceCents)} / {formatMoney(c.initialCents)}
                    </p>
                    {c.status === "ACTIVE" && c.balanceCents < c.initialCents && (
                      <p className="text-xs text-muted-foreground">
                        Usada: {formatMoney(c.initialCents - c.balanceCents)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Comprador:</span> {c.purchaserName} ·{" "}
                    {c.purchaserEmail}
                  </div>
                  {c.recipientEmail && c.recipientEmail !== c.purchaserEmail && (
                    <div>
                      <span className="font-medium text-foreground">Para:</span>{" "}
                      {c.recipientName} · {c.recipientEmail}
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    Comprada: {formatDateTime(c.createdAt)}
                    {c._count && c._count.redemptions > 0 && (
                      <> · {c._count.redemptions} canjes</>
                    )}
                  </div>
                </div>
                {c.status === "ACTIVE" && (
                  <div className="mt-3">
                    <Button size="sm" variant="ghost" onClick={() => cancel(c)} className="text-destructive">
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

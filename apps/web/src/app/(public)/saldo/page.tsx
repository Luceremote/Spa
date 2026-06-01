"use client";

import { useState } from "react";
import { Loader2, Gift, Award, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

interface GiftCardResult {
  code: string;
  balanceCents: number;
  initialCents: number;
}

interface LoyaltyResult {
  found: boolean;
  customerName?: string;
  balance: number;
  totalEarned?: number;
  totalRedeemed?: number;
}

export default function SaldoPage() {
  // Gift card
  const [code, setCode] = useState("");
  const [gcLoading, setGcLoading] = useState(false);
  const [gc, setGc] = useState<GiftCardResult | null>(null);
  const [gcError, setGcError] = useState("");

  // Puntos
  const [phone, setPhone] = useState("");
  const [ptLoading, setPtLoading] = useState(false);
  const [pt, setPt] = useState<LoyaltyResult | null>(null);
  const [ptError, setPtError] = useState("");

  async function checkGiftCard(e: React.FormEvent) {
    e.preventDefault();
    setGcError("");
    setGc(null);
    setGcLoading(true);
    try {
      const r = await api<{ giftCard: GiftCardResult }>(
        `/gift-cards/balance/${encodeURIComponent(code.trim())}`
      );
      setGc(r.giftCard);
    } catch (e: any) {
      setGcError(e.message ?? "No encontramos esa gift card");
    } finally {
      setGcLoading(false);
    }
  }

  async function checkPoints(e: React.FormEvent) {
    e.preventDefault();
    setPtError("");
    setPt(null);
    setPtLoading(true);
    try {
      const r = await api<LoyaltyResult>(
        `/marketing/loyalty/balance?phone=${encodeURIComponent(phone.trim())}`
      );
      setPt(r);
    } catch (e: any) {
      setPtError(e.message ?? "No se pudo consultar");
    } finally {
      setPtLoading(false);
    }
  }

  return (
    <div className="container py-8 sm:py-12 max-w-2xl">
      <header className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Consultar saldo</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Revisa el saldo de tu gift card o tus puntos de lealtad.
        </p>
      </header>

      {/* Gift card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" /> Gift card
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={checkGiftCard} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="font-mono"
                required
              />
            </div>
            <Button type="submit" disabled={gcLoading || !code}>
              {gcLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Consultar
            </Button>
          </form>
          {gcError && <p className="text-sm text-destructive mt-3">{gcError}</p>}
          {gc && (
            <div className="mt-4 p-5 rounded-lg bg-primary/5 border border-primary/20 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                Saldo disponible
              </div>
              <div className="text-3xl font-bold text-primary mt-1">
                {formatMoney(gc.balanceCents)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                de {formatMoney(gc.initialCents)} originales · código {gc.code}
              </div>
              <Button asChild className="mt-4" size="sm">
                <a href="/reservar">Usar al reservar</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Puntos de lealtad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-primary" /> Puntos de lealtad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={checkPoints} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="pt-phone">Teléfono</Label>
              <Input
                id="pt-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                required
              />
            </div>
            <Button type="submit" disabled={ptLoading || !phone}>
              {ptLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Consultar
            </Button>
          </form>
          {ptError && <p className="text-sm text-destructive mt-3">{ptError}</p>}
          {pt && (
            <div className="mt-4 p-5 rounded-lg bg-primary/5 border border-primary/20 text-center">
              {pt.found ? (
                <>
                  {pt.customerName && (
                    <div className="text-sm text-muted-foreground">Hola, {pt.customerName}</div>
                  )}
                  <div className="text-3xl font-bold text-primary mt-1">{pt.balance} pts</div>
                  {(pt.totalEarned != null || pt.totalRedeemed != null) && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Ganados {pt.totalEarned ?? 0} · Canjeados {pt.totalRedeemed ?? 0}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no tienes puntos con ese teléfono. ¡Reserva para empezar a acumular!
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

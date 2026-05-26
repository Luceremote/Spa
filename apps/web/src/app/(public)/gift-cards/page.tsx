"use client";

import { useState } from "react";
import { Loader2, Gift, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

const DENOMS = [
  { cents: 5000, label: "$50" },
  { cents: 10000, label: "$100", popular: true },
  { cents: 15000, label: "$150" },
  { cents: 20000, label: "$200" },
  { cents: 30000, label: "$300" },
];

interface BalanceResult {
  code: string;
  balanceCents: number;
  initialCents: number;
  currency: string;
  status: string;
  expiresAt: string | null;
}

export default function GiftCardsPage() {
  const [tab, setTab] = useState<"buy" | "check">("buy");

  return (
    <div className="container py-8 sm:py-12 max-w-3xl">
      <header className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 mb-4">
          <Gift className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Gift Cards</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
          Regala bienestar. El destinatario puede usarla en cualquiera de nuestros servicios.
        </p>
      </header>

      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => setTab("buy")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "buy" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
          }`}
        >
          Comprar
        </button>
        <button
          onClick={() => setTab("check")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "check" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
          }`}
        >
          Consultar saldo
        </button>
      </div>

      {tab === "buy" ? <BuyForm /> : <CheckBalance />}
    </div>
  );
}

function BuyForm() {
  const [amountCents, setAmountCents] = useState(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const finalAmount = customAmount ? Math.round(Number(customAmount) * 100) : amountCents;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload: any = {
        amountCents: finalAmount,
        purchaserName,
        purchaserEmail,
        ...(message && { message }),
      };
      if (forSomeoneElse) {
        payload.recipientName = recipientName;
        payload.recipientEmail = recipientEmail;
      }
      const { url } = await api<{ url: string }>("/gift-cards/purchase", {
        method: "POST",
        json: payload,
      });
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-sm mb-2 block">Elige el valor</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DENOMS.map((d) => (
                <button
                  key={d.cents}
                  type="button"
                  onClick={() => {
                    setAmountCents(d.cents);
                    setCustomAmount("");
                  }}
                  className={`relative p-3 sm:p-4 rounded-lg border-2 text-center transition-all ${
                    amountCents === d.cents && !customAmount
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {d.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      POPULAR
                    </span>
                  )}
                  <div className="font-bold text-base sm:text-lg">{d.label}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                O monto custom:
              </Label>
              <div className="relative flex-1 max-w-[160px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="20"
                  step="1"
                  placeholder="0"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Mínimo $20 USD</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-sm">Tu nombre</Label>
              <Input
                value={purchaserName}
                onChange={(e) => setPurchaserName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-sm">Tu email</Label>
              <Input
                type="email"
                value={purchaserEmail}
                onChange={(e) => setPurchaserEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <label className="flex items-center gap-2 text-sm mb-3">
              <input
                type="checkbox"
                checked={forSomeoneElse}
                onChange={(e) => setForSomeoneElse(e.target.checked)}
              />
              <Sparkles className="h-4 w-4 text-primary" />
              Es un regalo para alguien más
            </label>

            {forSomeoneElse && (
              <div className="space-y-4 bg-muted/40 p-4 rounded-lg">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Nombre del destinatario</Label>
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      required={forSomeoneElse}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Email del destinatario</Label>
                    <Input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      required={forSomeoneElse}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Mensaje (opcional)</Label>
                  <Textarea
                    rows={2}
                    maxLength={500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="¡Felicidades en tu día especial!"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-primary/5 p-4 rounded-lg flex items-center justify-between">
            <span className="text-sm">Total a pagar</span>
            <span className="text-2xl font-bold text-primary">{formatMoney(finalAmount)}</span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || finalAmount < 2000 || !purchaserName || !purchaserEmail}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Comprar gift card
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CheckBalance() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BalanceResult | null>(null);
  const [error, setError] = useState("");

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const r = await api<{ giftCard: BalanceResult }>(
        `/gift-cards/balance/${encodeURIComponent(code.trim())}`
      );
      setResult(r.giftCard);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono text-center tracking-wider uppercase"
          />
          <Button type="submit" disabled={loading || !code}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && (
          <div className="bg-gradient-to-br from-primary to-primary/70 text-white p-6 rounded-xl">
            <p className="text-xs uppercase tracking-widest opacity-80 mb-2">Saldo disponible</p>
            <p className="text-4xl font-bold mb-4">{formatMoney(result.balanceCents)}</p>
            <div className="flex justify-between text-sm opacity-90 pt-3 border-t border-white/20">
              <span>Valor inicial: {formatMoney(result.initialCents)}</span>
              <span>
                {result.expiresAt
                  ? `Expira: ${new Date(result.expiresAt).toLocaleDateString("es-US")}`
                  : "Sin expiración"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

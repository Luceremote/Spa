"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import type { LoyaltyAccount, LoyaltySettings } from "@/lib/types";
import { Loader2, Save, Plus, Minus, Award } from "lucide-react";

export default function LoyaltyPage() {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<{ accId: string; customerId: string; name: string } | null>(null);
  const [adjustPoints, setAdjustPoints] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        api<{ settings: LoyaltySettings }>("/marketing/loyalty/settings"),
        api<{ accounts: LoyaltyAccount[] }>("/marketing/loyalty/accounts", {
          token: getToken() ?? undefined,
        }),
      ]);
      setSettings(s.settings);
      setAccounts(a.accounts);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    try {
      const r = await api<{ settings: LoyaltySettings }>("/marketing/loyalty/settings", {
        method: "PUT",
        token: getToken() ?? undefined,
        json: {
          active: settings.active,
          pointsPerDollar: settings.pointsPerDollar,
          pointValueCents: settings.pointValueCents,
          minRedeemPoints: settings.minRedeemPoints,
        },
      });
      setSettings(r.settings);
      setMsg("Guardado ✓");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitAdjust() {
    if (!adjust) return;
    try {
      await api("/marketing/loyalty/adjust", {
        method: "POST",
        token: getToken() ?? undefined,
        json: {
          customerId: adjust.customerId,
          points: adjustPoints,
          note: adjustNote || null,
        },
      });
      setAdjust(null);
      setAdjustPoints(0);
      setAdjustNote("");
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading || !settings) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Programa de lealtad</h1>
        <p className="text-sm text-muted-foreground">
          Premia a tus clientes con puntos canjeables por descuentos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.active}
              onChange={(e) => setSettings({ ...settings, active: e.target.checked })}
            />
            Programa activo (otorgar puntos automáticamente en cada reserva pagada)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Puntos por dólar gastado</Label>
              <Input
                type="number"
                step="0.5"
                min={0}
                max={100}
                value={settings.pointsPerDollar}
                onChange={(e) =>
                  setSettings({ ...settings, pointsPerDollar: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Valor de cada punto (cents)</Label>
              <Input
                type="number"
                min={0}
                max={1000}
                value={settings.pointValueCents}
                onChange={(e) =>
                  setSettings({ ...settings, pointValueCents: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                {settings.pointValueCents}¢ = ${(settings.pointValueCents / 100).toFixed(2)} USD por punto
              </p>
            </div>
            <div className="space-y-1">
              <Label>Mínimo para canjear (puntos)</Label>
              <Input
                type="number"
                min={0}
                value={settings.minRedeemPoints}
                onChange={(e) =>
                  setSettings({ ...settings, minRedeemPoints: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar configuración
            </Button>
            {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas con puntos ({accounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aún no hay clientes con puntos acumulados.
            </p>
          ) : (
            <div className="divide-y">
              {accounts.map((acc) => (
                <div key={acc.id} className="py-3 flex items-center gap-4">
                  <Award className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{acc.customer?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {acc.customer?.phone} · Ganados {acc.totalEarned} · Canjeados {acc.totalRedeemed}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">{acc.pointsBalance}</div>
                    <div className="text-xs text-muted-foreground">pts</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setAdjust({
                        accId: acc.id,
                        customerId: acc.customerId,
                        name: acc.customer?.name ?? "",
                      })
                    }
                  >
                    Ajustar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {adjust && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setAdjust(null)}
        >
          <div
            className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Ajustar puntos — {adjust.name}</h3>
            <div className="space-y-1">
              <Label>Puntos (positivo = sumar, negativo = restar)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustPoints((p) => p - 10)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustPoints((p) => p + 10)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Nota (opcional)</Label>
              <Input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Bono cumpleaños, canje, etc."
                maxLength={200}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAdjust(null)}>
                Cancelar
              </Button>
              <Button onClick={submitAdjust} disabled={adjustPoints === 0}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

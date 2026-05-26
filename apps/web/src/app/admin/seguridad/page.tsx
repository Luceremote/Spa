"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Shield,
  ShieldOff,
  ShieldCheck,
  Copy,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken, setToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatDateTime } from "@/lib/utils";
import type { User, SecurityEvent } from "@/lib/types";

interface SetupData { secret: string; otpUri: string; qrDataUrl: string; }

export default function SeguridadPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // 2FA setup state
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [otp, setOtp] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const [me, ev] = await Promise.all([
      api<{ user: User }>("/auth/me", { token }),
      api<{ events: SecurityEvent[] }>("/audit/events?limit=50", { token }),
    ]);
    setUser(me.user);
    setEvents(ev.events);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function startSetup() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const r = await api<SetupData>("/2fa/setup", { token, method: "POST" });
      setSetupData(r);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      const r = await api<{ token: string; recoveryCodes: string[] }>("/2fa/confirm", {
        token,
        method: "POST",
        json: { token: otp.trim() },
      });
      setToken(r.token);
      setRecoveryCodes(r.recoveryCodes);
      setSetupData(null);
      setOtp("");
      load();
      toast("2FA activado ✓", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function disable2FA() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await api("/2fa/disable", { token, method: "POST", json: { password: disablePassword } });
      setDisablePassword("");
      load();
      toast("2FA desactivado", "success");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function copyAll() {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast("Códigos copiados", "success");
  }

  function downloadCodes() {
    if (!recoveryCodes) return;
    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spa-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Seguridad</h1>
        <p className="text-muted-foreground">2FA y auditoría de tu cuenta</p>
      </header>

      {/* 2FA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {user?.totpEnabled ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground" />
            )}
            Autenticación en dos pasos (2FA)
          </CardTitle>
          <CardDescription>
            {user?.totpEnabled
              ? `Activo. Te quedan ${user.recoveryCount ?? 0} códigos de recuperación.`
              : "Añade una capa extra usando una app autenticadora (Google Authenticator, 1Password, Authy)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recoveryCodes && (
            <div className="border-2 border-amber-500/40 bg-amber-50 p-4 rounded-md">
              <p className="font-semibold mb-2 text-amber-900">
                ⚠️ Guarda estos códigos de recuperación AHORA
              </p>
              <p className="text-sm text-amber-800 mb-3">
                Sólo se muestran una vez. Sin tu teléfono ni estos códigos perderás acceso.
              </p>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm mb-3">
                {recoveryCodes.map((c) => (
                  <code key={c} className="bg-white p-2 rounded border">{c}</code>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyAll}>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
                <Button size="sm" variant="outline" onClick={downloadCodes}>
                  <Download className="h-3.5 w-3.5" /> Descargar
                </Button>
                <Button size="sm" onClick={() => setRecoveryCodes(null)}>
                  Ya los guardé
                </Button>
              </div>
            </div>
          )}

          {!user?.totpEnabled && !setupData && (
            <Button onClick={startSetup} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Activar 2FA
            </Button>
          )}

          {setupData && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setupData.qrDataUrl}
                  alt="QR 2FA"
                  className="w-48 h-48 border rounded-md"
                />
                <div className="flex-1 space-y-3">
                  <p className="text-sm">
                    1. Escanea el QR con tu app autenticadora, o ingresa este código manualmente:
                  </p>
                  <code className="block text-xs bg-muted p-2 rounded font-mono break-all">
                    {setupData.secret}
                  </code>
                  <p className="text-sm">2. Ingresa el código de 6 dígitos que muestra la app:</p>
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="font-mono tracking-widest text-lg text-center max-w-[200px]"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  <div className="flex gap-2">
                    <Button onClick={confirmSetup} disabled={busy || otp.length !== 6}>
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirmar
                    </Button>
                    <Button variant="outline" onClick={() => { setSetupData(null); setOtp(""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user?.totpEnabled && !recoveryCodes && (
            <div className="space-y-3 pt-3 border-t">
              <p className="text-sm font-medium">Desactivar 2FA</p>
              <div className="flex gap-2 max-w-md">
                <Input
                  type="password"
                  placeholder="Confirma tu contraseña"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
                <Button variant="destructive" onClick={disable2FA} disabled={busy || !disablePassword}>
                  <ShieldOff className="h-4 w-4" /> Desactivar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auditoría */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos recientes</CardTitle>
          <CardDescription>Últimos 50 eventos de seguridad</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {events.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Sin eventos.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="px-6 py-3 text-sm grid grid-cols-[1fr,auto] gap-4">
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-mono mr-2 ${
                        e.type.includes("FAILED") || e.type.includes("INVALID") || e.type.includes("LOCKED")
                          ? "bg-destructive/20 text-destructive"
                          : e.type === "LOGIN_SUCCESS" || e.type === "WEBHOOK_OK"
                          ? "bg-green-500/20 text-green-700"
                          : "bg-muted"
                      }`}
                    >
                      {e.type}
                    </span>
                    {e.email && <span className="text-muted-foreground">{e.email}</span>}
                    {e.ip && <span className="text-muted-foreground"> · {e.ip}</span>}
                  </div>
                  <time className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDateTime(e.createdAt)}
                  </time>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

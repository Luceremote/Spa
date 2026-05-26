"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@spa.local");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 2FA challenge
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api<
        | { token: string; user: User }
        | { challenge: true; challengeToken: string }
      >("/auth/login", { method: "POST", json: { email, password } });

      if ("challenge" in r) {
        setChallengeToken(r.challengeToken);
      } else {
        setToken(r.token);
        router.push("/admin");
      }
    } catch (err: any) {
      setError(err.message ?? "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await api<{ token: string; user: User }>("/2fa/verify", {
        method: "POST",
        json: { challengeToken, token: otp.trim() },
      });
      setToken(r.token);
      router.push("/admin");
    } catch (err: any) {
      setError(err.message ?? "Código incorrecto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          {challengeToken ? (
            <>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Verificación 2FA
              </CardTitle>
              <CardDescription>
                Ingresa el código de 6 dígitos de tu app autenticadora, o un código de recuperación (XXXXX-XXXXX).
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle>Panel de administración</CardTitle>
              <CardDescription>Inicia sesión para continuar</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!challengeToken ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Iniciar sesión
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Demo: admin@spa.local / admin123
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Código</Label>
                <Input
                  id="otp"
                  inputMode="text"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verificar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setChallengeToken(null);
                  setOtp("");
                  setError("");
                }}
              >
                ← Volver
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import type { EmailCampaign } from "@/lib/types";
import { Loader2, Plus, Send, Trash2, Pencil } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  SENDING: { label: "Enviando…", className: "border border-border" },
  SENT: { label: "Enviada", className: "bg-primary text-primary-foreground" },
  FAILED: { label: "Falló", className: "bg-destructive text-white" },
};

interface FormState {
  id?: string;
  subject: string;
  preheader: string;
  htmlBody: string;
}

const EMPTY: FormState = { subject: "", preheader: "", htmlBody: "" };

export default function CampaignsPage() {
  const [list, setList] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ campaigns: EmailCampaign[] }>("/marketing/campaigns", {
        token: getToken() ?? undefined,
      });
      setList(r.campaigns);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setForm(EMPTY);
    setOpenForm(true);
  }
  function startEdit(c: EmailCampaign) {
    setForm({
      id: c.id,
      subject: c.subject,
      preheader: c.preheader ?? "",
      htmlBody: c.htmlBody,
    });
    setOpenForm(true);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const body = {
        subject: form.subject,
        preheader: form.preheader || null,
        htmlBody: form.htmlBody,
      };
      if (form.id) {
        await api(`/marketing/campaigns/${form.id}`, {
          method: "PUT",
          token: getToken() ?? undefined,
          json: body,
        });
      } else {
        await api("/marketing/campaigns", {
          method: "POST",
          token: getToken() ?? undefined,
          json: body,
        });
      }
      setOpenForm(false);
      setForm(EMPTY);
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta campaña?")) return;
    await api(`/marketing/campaigns/${id}`, {
      method: "DELETE",
      token: getToken() ?? undefined,
    });
    load();
  }

  async function send(id: string) {
    if (!confirm("Esto enviará la campaña a TODOS los suscriptores activos. ¿Continuar?")) return;
    setSending(id);
    try {
      const r = await api<{ queued: number }>(`/marketing/campaigns/${id}/send`, {
        method: "POST",
        token: getToken() ?? undefined,
      });
      setMsg(`Envío en cola para ${r.queued} destinatarios.`);
      load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campañas de email</h1>
          <p className="text-sm text-muted-foreground">
            Crea y envía campañas a tus suscriptores del newsletter.
          </p>
        </div>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-2" /> Nueva campaña
        </Button>
      </div>

      {msg && <div className="text-sm bg-muted/40 border rounded px-3 py-2">{msg}</div>}

      {openForm && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Editar campaña" : "Nueva campaña"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Asunto</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label>Preheader (opcional)</Label>
              <Input
                value={form.preheader}
                onChange={(e) => setForm({ ...form, preheader: e.target.value })}
                maxLength={200}
                placeholder="Texto de preview en la bandeja"
              />
            </div>
            <div className="space-y-1">
              <Label>Cuerpo HTML</Label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm font-mono min-h-[280px]"
                value={form.htmlBody}
                onChange={(e) => setForm({ ...form, htmlBody: e.target.value })}
                maxLength={100000}
                placeholder={'<h1>Hola {{name}}</h1>\n<p>Aprovecha 20% de descuento esta semana…</p>'}
              />
              <p className="text-xs text-muted-foreground">
                Se añade automáticamente un pie con link para cancelar suscripción.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving || !form.subject || form.htmlBody.length < 10}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar borrador
              </Button>
              <Button variant="outline" onClick={() => { setOpenForm(false); setForm(EMPTY); }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aún no hay campañas. Crea una nueva para comenzar.
            </p>
          ) : (
            <div className="divide-y">
              {list.map((c) => {
                const st = STATUS_LABEL[c.status];
                return (
                  <div key={c.id} className="py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.status === "SENT" && c.sentAt
                          ? `Enviada el ${new Date(c.sentAt).toLocaleString()} — ${c.successCount}/${c.recipientCount} exitosos`
                          : `Creada el ${new Date(c.createdAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.className}`}>
                      {st.label}
                    </span>
                    {c.status === "DRAFT" && (
                      <>
                        <button
                          onClick={() => startEdit(c)}
                          className="p-2 hover:bg-muted rounded"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <Button
                          size="sm"
                          onClick={() => send(c.id)}
                          disabled={sending === c.id}
                        >
                          {sending === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1.5" />
                          )}
                          Enviar
                        </Button>
                        <button
                          onClick={() => remove(c.id)}
                          className="p-2 hover:bg-muted rounded text-destructive"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

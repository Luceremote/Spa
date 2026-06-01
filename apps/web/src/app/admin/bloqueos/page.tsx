"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UserX, CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/components/toast";
import { formatDateTime } from "@/lib/utils";
import type { StaffBlock, Staff } from "@/lib/types";

interface FormState { staffId: string; startAt: string; endAt: string; reason: string; }
function nowIsoLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
const EMPTY: FormState = { staffId: "", startAt: nowIsoLocal(), endAt: nowIsoLocal(), reason: "" };

export default function BloqueosPage() {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<StaffBlock[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = getToken(); if (!token) return;
    setLoading(true);
    const [b, s] = await Promise.all([
      api<{ blocks: StaffBlock[] }>("/staff-blocks", { token }),
      api<{ staff: Staff[] }>("/staff", { token }),
    ]);
    setBlocks(b.blocks); setStaffList(s.staff); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSave() {
    const token = getToken(); if (!token) return;
    setSaving(true);
    try {
      await api("/staff-blocks", {
        token, method: "POST",
        json: {
          staffId: form.staffId,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          reason: form.reason || null,
        },
      });
      toast("Bloqueo creado", "success");
      setCreating(false); setForm(EMPTY); load();
    } catch (e: any) { toast(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function del(b: StaffBlock) {
    if (!confirm(`¿Eliminar bloqueo de ${b.staff?.name ?? "staff"}?`)) return;
    const token = getToken(); if (!token) return;
    try {
      await api(`/staff-blocks/${b.id}`, { token, method: "DELETE" });
      toast("Eliminado", "success"); load();
    } catch (e: any) { toast(e.message, "error"); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Bloqueos de personal</h1>
          <p className="text-sm text-muted-foreground">
            Vacaciones o tiempo no disponible por profesional (no afecta al resto)
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Nuevo bloqueo
          </Button>
        )}
      </header>

      {creating && (
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-4 max-w-xl">
            <h2 className="text-lg font-semibold">Nuevo bloqueo</h2>
            <div className="space-y-2">
              <Label>Profesional</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.staffId}
                onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
              >
                <option value="">— Selecciona —</option>
                {staffList.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Desde</Label>
                <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Hasta</Label>
                <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input placeholder="Vacaciones, cita médica..." value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setCreating(false); setForm(EMPTY); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.staffId}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : blocks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <CalendarX2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Sin bloqueos activos.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {blocks.map((b) => (
              <div key={b.id} className="p-4 flex items-center gap-3">
                <UserX className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{b.staff?.name ?? "Staff"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(b.startAt)} → {formatDateTime(b.endAt)}
                    {b.reason && <span> · {b.reason}</span>}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(b)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

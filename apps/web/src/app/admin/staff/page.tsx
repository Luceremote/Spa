"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getToken, uploadImage } from "@/lib/api";
import { useToast } from "@/components/toast";
import type { Staff, Service } from "@/lib/types";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function minsToHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function hhmmToMins(s: string) {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  bio: string;
  avatarUrl: string;
  active: boolean;
  workingDays: number[];
  workingFrom: number;
  workingTo: number;
  commissionPercent: number;
  serviceIds: string[];
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  bio: "",
  avatarUrl: "",
  active: true,
  workingDays: [1, 2, 3, 4, 5, 6],
  workingFrom: 540,
  workingTo: 1140,
  commissionPercent: 0,
  serviceIds: [],
};

export default function StaffPage() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    const [s, svc] = await Promise.all([
      api<{ staff: Staff[] }>("/staff?all=true"),
      api<{ services: Service[] }>("/services?all=true"),
    ]);
    setStaff(s.staff);
    setServices(svc.services);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(EMPTY);
    setCreating(true);
    setEditing(null);
  }
  function openEdit(s: Staff) {
    setForm({
      name: s.name,
      email: s.email ?? "",
      phone: s.phone ?? "",
      bio: s.bio ?? "",
      avatarUrl: s.avatarUrl ?? "",
      active: s.active,
      workingDays: s.workingDays,
      workingFrom: s.workingFrom,
      workingTo: s.workingTo,
      commissionPercent: s.commissionPercent ?? 0,
      serviceIds: s.services?.map((sv) => sv.id) ?? [],
    });
    setEditing(s);
    setCreating(false);
  }
  function close() {
    setEditing(null);
    setCreating(false);
  }

  async function handleSave() {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        email: form.email || null,
        phone: form.phone || null,
        bio: form.bio || null,
        avatarUrl: form.avatarUrl || null,
      };
      if (editing) {
        await api(`/staff/${editing.id}`, { token, method: "PUT", json: payload });
        toast("Profesional actualizado", "success");
      } else {
        await api("/staff", { token, method: "POST", json: payload });
        toast("Profesional creado", "success");
      }
      close();
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Staff) {
    if (!confirm(`¿Eliminar a "${s.name}"?`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/staff/${s.id}`, { token, method: "DELETE" });
      toast("Eliminado", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function handleAvatar(file: File) {
    const token = getToken();
    if (!token) return;
    try {
      const { url } = await uploadImage(file, token);
      setForm((f) => ({ ...f, avatarUrl: url }));
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(d)
        ? f.workingDays.filter((x) => x !== d)
        : [...f.workingDays, d].sort(),
    }));
  }

  function toggleService(id: string) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter((x) => x !== id)
        : [...f.serviceIds, id],
    }));
  }

  const showForm = creating || editing;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profesionales</h1>
          <p className="text-muted-foreground">Quién trabaja en tu spa y cuándo</p>
        </div>
        {!showForm && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        )}
      </header>

      {showForm ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editing ? "Editar" : "Nuevo profesional"}</h2>

            <div className="grid sm:grid-cols-[120px,1fr] gap-4">
              <div>
                {form.avatarUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.avatarUrl} alt="" className="h-28 w-28 rounded-full object-cover border" />
                    <button
                      onClick={() => setForm((f) => ({ ...f, avatarUrl: "" }))}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="h-28 w-28 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Bio (opcional)</Label>
              <Textarea
                rows={2}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>

            <div>
              <Label className="mb-2 block">Días de trabajo</Label>
              <div className="flex gap-2">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border ${
                      form.workingDays.includes(i)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Hora inicio</Label>
                <Input
                  type="time"
                  value={minsToHHMM(form.workingFrom)}
                  onChange={(e) => setForm((f) => ({ ...f, workingFrom: hhmmToMins(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Hora fin</Label>
                <Input
                  type="time"
                  value={minsToHHMM(form.workingTo)}
                  onChange={(e) => setForm((f) => ({ ...f, workingTo: hhmmToMins(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1">
                Comisión (% sobre cada reserva completada)
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.commissionPercent}
                onChange={(e) => setForm((f) => ({ ...f, commissionPercent: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Solo se calcula sobre reservas con estado COMPLETED y pago confirmado. 0 = sin comisión.
              </p>
            </div>

            <div>
              <Label className="mb-2 block">
                Servicios que atiende ({form.serviceIds.length === 0 ? "todos" : form.serviceIds.length})
              </Label>
              <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sin selección = puede hacer todos los servicios.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Activo
            </label>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={close}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Aún no tienes profesionales. Añade uno para empezar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-5">
                <div className="flex gap-3 mb-3">
                  {s.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{s.name}</h3>
                    {!s.active && <span className="text-xs px-2 py-0.5 bg-muted rounded">Inactivo</span>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.workingDays.map((d) => DAYS[d]).join(" ")} · {minsToHHMM(s.workingFrom)}–{minsToHHMM(s.workingTo)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {s.services?.length ? `${s.services.length} servicios` : "Todos los servicios"}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(s)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, getToken } from "@/lib/api";
import type { Customer } from "@/lib/types";

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const t = setTimeout(() => {
      setLoading(true);
      api<{ customers: Customer[] }>(`/customers?q=${encodeURIComponent(q)}`, { token })
        .then((r) => setCustomers(r.customers))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Base de datos de tus clientes</p>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : customers.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No hay clientes aún.</p>
          ) : (
            <div className="divide-y">
              {customers.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/40">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.phone} {c.email && `· ${c.email}`}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{c._count?.bookings ?? 0} reservas</p>
                    <p className="text-xs text-muted-foreground">
                      Desde {new Date(c.createdAt).toLocaleDateString("es")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Users,
  Palette,
  Settings,
  LogOut,
  Loader2,
  UserCog,
  Tag,
  CalendarX,
  FolderTree,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, getToken, setToken } from "@/lib/api";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendario", label: "Calendario", icon: Calendar },
  { href: "/admin/servicios", label: "Servicios", icon: Sparkles },
  { href: "/admin/categorias", label: "Categorías", icon: FolderTree },
  { href: "/admin/staff", label: "Profesionales", icon: UserCog },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/cupones", label: "Cupones", icon: Tag },
  { href: "/admin/cierres", label: "Días cerrados", icon: CalendarX },
  { href: "/admin/personalizacion", label: "Personalización", icon: Palette },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
  { href: "/admin/seguridad", label: "Seguridad", icon: ShieldCheck },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  // Login page no usa shell
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }
    const token = getToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    api<{ user: User }>("/auth/me", { token })
      .then((r) => setUser(r.user))
      .catch(() => {
        setToken(null);
        router.replace("/admin/login");
      })
      .finally(() => setChecking(false));
  }, [isLoginPage, router]);

  function handleLogout() {
    setToken(null);
    router.replace("/admin/login");
  }

  if (isLoginPage) return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30">
      <aside className="md:w-64 md:fixed md:inset-y-0 bg-card border-r flex flex-col">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">Spa Admin</h2>
          <p className="text-xs text-muted-foreground">{user.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-foreground/80"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t space-y-2">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/" target="_blank">
              Ver sitio público
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 md:ml-64 p-6 md:p-10">{children}</main>
    </div>
  );
}

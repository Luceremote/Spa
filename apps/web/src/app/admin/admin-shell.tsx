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
  Gift,
  CalendarX,
  FolderTree,
  ShieldCheck,
  Menu,
  X,
  Camera,
  Star,
  Mail,
  Wallet,
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
  { href: "/admin/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/admin/gift-cards", label: "Gift Cards", icon: Gift },
  { href: "/admin/galeria", label: "Galería", icon: Camera },
  { href: "/admin/resenas", label: "Reseñas", icon: Star },
  { href: "/admin/suscriptores", label: "Newsletter", icon: Mail },
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Cerrar drawer al navegar
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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

  const sidebarContent = (
    <>
      <div className="p-5 sm:p-6 border-b">
        <h2 className="font-semibold text-lg">Spa Admin</h2>
        <p className="text-xs text-muted-foreground truncate">{user.name}</p>
      </div>
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground/80"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 sm:p-4 border-t space-y-2">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/" target="_blank">
            Ver sitio público
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Topbar móvil */}
      <header className="md:hidden sticky top-0 z-30 bg-card border-b flex items-center justify-between h-14 px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-md hover:bg-muted"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="font-semibold">Spa Admin</h2>
        <div className="w-9" />
      </header>

      {/* Drawer móvil */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-card flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Sidebar fijo desktop */}
      <aside className="hidden md:flex md:w-64 md:fixed md:inset-y-0 bg-card border-r flex-col">
        {sidebarContent}
      </aside>

      <main className="md:ml-64 p-4 sm:p-6 md:p-10">{children}</main>
    </div>
  );
}

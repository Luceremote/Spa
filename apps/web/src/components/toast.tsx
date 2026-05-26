"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface Ctx {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastCtx = createContext<Ctx>({ toast: () => {} });

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-md shadow-lg border bg-card text-card-foreground animate-in slide-in-from-right ${
              t.kind === "success"
                ? "border-green-500/40"
                : t.kind === "error"
                ? "border-destructive/40"
                : "border-border"
            }`}
          >
            {t.kind === "success" && <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />}
            {t.kind === "error" && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
            {t.kind === "info" && <Info className="h-5 w-5 text-primary flex-shrink-0" />}
            <p className="text-sm flex-1">{t.message}</p>
            <button
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

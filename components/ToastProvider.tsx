"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
};

type ToastContextValue = {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 4000;

const ICONS: Record<ToastType, string> = {
  success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
  error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
  info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>`,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: "bg-emerald-500 text-white border-emerald-600",
  error: "bg-rfcm-red text-white border-rfcm-red-dark",
  info: "bg-blue-500 text-white border-blue-600",
  warning: "bg-amber-500 text-white border-amber-600",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    setToasts((t) => [...t, { id, message, type, timestamp }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, TOAST_DURATION);
  }, []);

  const contextValue = useMemo(() => ({ toasts, showToast }), [toasts, showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);

  useState(() => {
    const startTime = Date.now();
    const duration = TOAST_DURATION;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        setExiting(true);
        setTimeout(() => {}, 300);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  });

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-2xl backdrop-blur-sm transform transition-all duration-300 ${
        exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      } ${TOAST_STYLES[toast.type]}`}
      style={{
        animation: exiting ? "none" : "toastSlideIn 0.3s ease-out",
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <span dangerouslySetInnerHTML={{ __html: ICONS[toast.type] }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">{toast.message}</p>
      </div>
      <div className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-xl transition-all duration-100" style={{ width: `${progress}%` }} />
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toasts: [], showToast: () => {} };
  return ctx;
}

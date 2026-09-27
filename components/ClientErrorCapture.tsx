"use client";

export default function ClientErrorCapture() {
  if (typeof window === "undefined") return null;

  const capture = (message: string, stack?: string) => {
    try {
      const payload: Record<string, unknown> = {
        message,
        stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/client-errors", blob);
      } else {
        fetch("/api/client-errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // never throw from error capture
    }
  };

  if (typeof window !== "undefined") {
    window.onerror = (msg, url, line, col, error) => {
      capture(String(msg), error?.stack);
      return false;
    };

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason instanceof Error
            ? reason.message
            : String(reason);
      const stack =
        reason instanceof Error ? reason.stack : undefined;
      capture(message, stack);
    });
  }

  return null;
}

"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

type ClientError = {
  id: string;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
};

export default function ClientErrorsPage() {
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/client-errors");
        if (!res.ok) throw new Error("Failed to load client errors");
        const data = await res.json();
        setErrors(data.errors ?? []);
      } catch (e: any) {
        setError(e.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-rfcm-charcoal">Client Errors</h1>
          <p className="text-sm text-rfcm-charcoal/60 mt-1">
            Recent uncaught client-side errors captured from users&apos; browsers.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-rfcm-charcoal/60">Loading...</div>
        ) : errors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-rfcm-yellow-soft p-8 text-center">
            <p className="text-sm text-rfcm-charcoal/60">No client errors captured yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((err) => (
              <div key={err.id} className="bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-rfcm-charcoal break-words">{err.message}</p>
                    {err.stack && (
                      <pre className="mt-2 text-xs text-rfcm-charcoal/70 bg-rfcm-cream-dark/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                        {err.stack}
                      </pre>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-rfcm-charcoal/50">
                      {err.url && <span>URL: {err.url}</span>}
                      {err.user_agent && <span>UA: {err.user_agent}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-rfcm-charcoal/50 whitespace-nowrap">
                    {new Date(err.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

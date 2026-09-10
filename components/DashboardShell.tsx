"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider } from "./ToastProvider";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/classes", label: "Classes" },
  { href: "/dashboard/tests", label: "Examinations" },
  { href: "/dashboard/grading", label: "Manual Grading" },
  { href: "/dashboard/results", label: "Results" },
  { href: "/dashboard/submissions", label: "Submissions" },
  { href: "/dashboard/stuck-attempts", label: "Stuck Attempts" },
  { href: "/dashboard/question-submissions", label: "Submit Questions" },
  { href: "/dashboard/admins", label: "Admins & Teachers" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-rfcm-cream-dark">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between bg-rfcm-charcoal text-white px-4 py-3">
          <div>
            <p className="font-serif font-bold text-lg text-rfcm-yellow">RFCM CBT</p>
          </div>
          <button onClick={() => setOpen(true)} className="text-white p-1" aria-label="Open menu">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-56 bg-rfcm-charcoal text-white p-5">
              <div className="mb-8">
                <p className="font-serif font-bold text-lg text-rfcm-yellow">RFCM CBT</p>
                <p className="text-xs text-white/50">Superadmin</p>
              </div>
              <nav className="space-y-1">
                {NAV.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                      className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${active ? "bg-rfcm-red text-white" : "text-white/70 hover:bg-white/10"}`}>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Desktop sidebar + content */}
        <div className="md:flex min-h-screen">
          <aside className="hidden md:block w-56 bg-rfcm-charcoal text-white flex-shrink-0 p-5">
            <div className="mb-8">
              <p className="font-serif font-bold text-lg text-rfcm-yellow">RFCM CBT</p>
              <p className="text-xs text-white/50">Superadmin</p>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${active ? "bg-rfcm-red text-white" : "text-white/70 hover:bg-white/10"}`}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider } from "./ToastProvider";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/classes", label: "Classes" },
  { href: "/dashboard/tests", label: "Examinations" },
  { href: "/dashboard/grading", label: "Manual Grading" },
  { href: "/dashboard/results", label: "Results" },
  { href: "/dashboard/admins", label: "Admins & Teachers" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-rfcm-cream-dark flex">
        <aside className="w-56 bg-rfcm-charcoal text-white flex-shrink-0 p-5">
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
        <div className="flex-1 p-8">{children}</div>
      </div>
    </ToastProvider>
  );
}

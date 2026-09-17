"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastProvider, useToast } from "./ToastProvider";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" },
  { href: "/dashboard/classes", label: "Classes", icon: "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.56 50.56 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" },
  { href: "/dashboard/students", label: "Students", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-3.625-3.568 4.125 4.125 0 00-3.568 3.625 9.337 9.337 0 00-.952 4.121 9.38 9.38 0 00.372 2.625m0 0a9.38 9.38 0 00.372 2.625M15 19.128v.003M15 19.128a9.38 9.38 0 01-2.625.372 9.337 9.337 0 01-4.121-.952 4.125 4.125 0 01-3.625-3.568 4.125 4.125 0 01-3.568 3.625 9.337 9.337 0 01-.952 4.121 9.38 9.38 0 01-.372 2.625m0 0v.003M15 19.128v.003" },
  { href: "/dashboard/tests", label: "Examinations", icon: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" },
  { href: "/dashboard/grading", label: "Manual Grading", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" },
  { href: "/dashboard/results", label: "Results", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
  { href: "/dashboard/submissions", label: "Submissions", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { href: "/dashboard/stuck-attempts", label: "Stuck Attempts", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/dashboard/question-submissions", label: "Submit Questions", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" },
  { href: "/dashboard/admins", label: "Admins & Teachers", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-3.625-3.568 4.125 4.125 0 00-3.568 3.625 9.337 9.337 0 00-.952 4.121 9.38 9.38 0 00.372 2.625m0 0a9.38 9.38 0 00.372 2.625M15 19.128v.003" },
];

function LogoutButton() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        showToast("Signed out successfully", "info");
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      } else {
        showToast("Failed to sign out", "error");
      }
    } catch {
      showToast("Network error — please try again", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
      </svg>
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : { role: "", name: "" })
      .then((data) => {
        setRole(data.role ?? "");
        setName(data.name ?? "");
      })
      .catch(() => {});
  }, []);

  const visibleNav = NAV.filter((item) => {
    if (item.href === "/dashboard/admins") {
      return role === "superadmin" || role === "admin";
    }
    return true;
  });

  const roleColors: Record<string, string> = {
    superadmin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    admin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    executive: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    teacher: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

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
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-rfcm-charcoal text-white p-5">
              <div className="mb-8">
                <p className="font-serif font-bold text-lg text-rfcm-yellow">RFCM CBT</p>
                <p className="text-xs text-white/50 capitalize">{role || "User"}</p>
              </div>
              <nav className="space-y-1">
                {visibleNav.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                        ${active ? "bg-rfcm-red text-white shadow-lg shadow-rfcm-red/20" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      {item.label}
                    </Link>
                  );
                })}
                <LogoutButton />
              </nav>
            </aside>
          </div>
        )}

        {/* Desktop sidebar + content */}
        <div className="md:flex min-h-screen">
          <aside className="hidden md:flex md:flex-col md:w-64 bg-rfcm-charcoal text-white flex-shrink-0">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-rfcm-red flex items-center justify-center">
                  <span className="font-serif font-bold text-rfcm-yellow text-lg">R</span>
                </div>
                <div>
                  <p className="font-serif font-bold text-lg text-rfcm-yellow">RFCM CBT</p>
                  <p className="text-xs text-white/50 capitalize">{role || "User"}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {visibleNav.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                        ${active ? "bg-rfcm-red text-white shadow-lg shadow-rfcm-red/20" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="mt-auto p-6 border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-rfcm-yellow">
                  {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{name}</p>
                  <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${roleColors[role] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
                    {role}
                  </span>
                </div>
              </div>
              <LogoutButton />
            </div>
          </aside>
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

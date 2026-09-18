"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/student/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/student/profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/student/results", label: "Exam History", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/student-logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-rfcm-cream">
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b border-rfcm-yellow-soft">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 relative">
            <Image src="/logo.jpg" alt="RFCM logo" fill sizes="32px" className="object-contain rounded-full" />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-rfcm-red font-semibold">RFCM CBT</p>
            <p className="text-xs font-bold text-rfcm-charcoal">Student Portal</p>
          </div>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-rfcm-cream-dark transition-colors">
          <svg className="w-5 h-5 text-rfcm-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-rfcm-charcoal text-white p-5 animate-drawer">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] tracking-[0.15em] uppercase text-rfcm-red font-semibold">RFCM CBT</p>
                <p className="text-sm font-bold">Student Portal</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <button
                    key={item.href}
                    onClick={() => { router.push(item.href); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto pt-6 border-t border-white/10">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className={`hidden md:flex md:flex-col md:w-64 bg-rfcm-charcoal text-white flex-shrink-0 transition-all duration-700 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}>
          <div className="p-5">
            <div className="mb-6">
              <p className="text-[10px] tracking-[0.15em] uppercase text-rfcm-red font-semibold">RFCM CBT</p>
              <p className="text-sm font-bold mt-1">Student Portal</p>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="mt-auto p-5 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className={`flex-1 p-4 md:p-8 overflow-y-auto transition-all duration-700 delay-150 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

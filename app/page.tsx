"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Role = "student" | "staff" | "admin";

const ROLES: { key: Role; label: string; subtitle: string; href: string; color: string; icon: string }[] = [
  {
    key: "student",
    label: "I'm a Student",
    subtitle: "Register once, then take your examination",
    href: "#",
    color: "from-blue-500 to-blue-600",
    icon: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z M12 14l9-5-9-5-9 5 9 5z",
  },
  {
    key: "staff",
    label: "I'm a Staff",
    subtitle: "Executive or Teacher portal",
    href: "/login",
    color: "from-emerald-500 to-emerald-600",
    icon: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 7a2 2 0 012 2v1h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H8a2 2 0 01-2-2v-1H5a1 1 0 01-1-1v-3a1 1 0 011-1h1V9a2 2 0 012-2h8z",
  },
  {
    key: "admin",
    label: "Admin",
    subtitle: "Superadmin and Admin center",
    href: "/login",
    color: "from-rfcm-red to-rfcm-red-dark",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-rfcm-cream">
      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-rfcm-yellow-soft sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 md:w-14 md:h-14">
              <Image
                src="/logo.jpg"
                alt="RFCM logo"
                fill
                sizes="56px"
                className="object-contain rounded-full"
                priority
              />
            </div>
            <div>
              <p className="text-[10px] md:text-xs tracking-[0.15em] uppercase text-rfcm-red font-semibold">
                Reconciled Family of Christ Mission
              </p>
              <h1 className="font-serif text-xl md:text-2xl font-bold text-rfcm-charcoal leading-tight">
                RFCM CBT
              </h1>
              <p className="text-[10px] md:text-xs text-rfcm-charcoal/60">Sunday School Examination</p>
            </div>
          </div>
          <div className="hidden md:block">
            <span className="text-xs text-rfcm-charcoal/50">© {new Date().getFullYear()} RFCM IT Department</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className={`text-center mb-12 md:mb-16 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-rfcm-charcoal mb-4">
            Welcome to <span className="text-rfcm-red">RFCM CBT</span>
          </h2>
          <p className="text-sm md:text-base text-rfcm-charcoal/60 max-w-xl mx-auto">
            Choose your portal below to get started. Students can register and take examinations. Staff and Admin can sign in to manage the system.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl w-full">
          {ROLES.map((role, idx) => {
            if (role.key === "student") {
              return (
                <div
                  key={role.key}
                  className={`bg-white rounded-3xl border border-rfcm-yellow-soft p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={{ transitionDelay: `${idx * 150}ms` }}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 shadow-lg`}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={role.icon} />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-rfcm-charcoal mb-2">
                    {role.label}
                  </h3>
                  <p className="text-sm text-rfcm-charcoal/60 mb-6">{role.subtitle}</p>
                  <div className="space-y-3">
                    <a
                      href="/register"
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-rfcm-red text-white text-sm font-semibold py-3 hover:bg-rfcm-red-dark transition-colors"
                    >
                      Register
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </a>
                    <a
                      href="/student"
                      className="flex items-center justify-center gap-2 w-full rounded-xl border border-rfcm-yellow-soft text-rfcm-charcoal text-sm font-semibold py-3 hover:bg-rfcm-cream-dark transition-colors"
                    >
                      Take Exam
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </a>
                  </div>
                </div>
              );
            }

            return (
              <a
                key={role.key}
                href={role.href}
                className={`group relative bg-white rounded-3xl border border-rfcm-yellow-soft p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${idx * 150}ms` }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={role.icon} />
                  </svg>
                </div>
                <h3 className="font-serif text-xl font-bold text-rfcm-charcoal mb-2 group-hover:text-rfcm-red transition-colors">
                  {role.label}
                </h3>
                <p className="text-sm text-rfcm-charcoal/60 mb-6">{role.subtitle}</p>
                <div className="flex items-center text-sm font-medium text-rfcm-red group-hover:gap-2 transition-all">
                  <span>Sign In</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </a>
            );
          })}
        </div>

        {/* Security note */}
        <div className={`mt-12 md:mt-16 text-center transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <p className="text-xs text-rfcm-charcoal/40">
            Admin access is restricted. Direct login is available at <a href="/login" className="text-rfcm-red font-medium hover:underline">/login</a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white/60 backdrop-blur-sm border-t border-rfcm-yellow-soft py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs text-rfcm-charcoal/50">
            © {new Date().getFullYear()} Reconciled Family of Christ Mission. All rights reserved.
          </p>
          <p className="text-[10px] text-rfcm-charcoal/40 mt-1">
            Designed and developed by RFCM IT Department @2026
          </p>
        </div>
      </footer>
    </div>
  );
}

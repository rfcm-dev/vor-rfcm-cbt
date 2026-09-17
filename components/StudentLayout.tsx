"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-rfcm-cream">
      <header className="flex flex-col items-center pt-10 pb-8 px-4 text-center">
        <div className={`w-20 h-20 relative mb-4 transition-all duration-700 ${mounted ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}>
          <Image src="/logo.jpg" alt="RFCM logo" fill className="object-contain rounded-full" priority />
        </div>
        <p className={`text-xs tracking-[0.2em] uppercase text-rfcm-red font-semibold transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          Reconciled Family of Christ Mission
        </p>
        <h1 className={`font-serif text-3xl font-bold text-rfcm-charcoal mt-1 transition-all duration-700 delay-150 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          RFCM CBT
        </h1>
        <p className={`text-sm text-rfcm-charcoal/60 mt-0.5 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          Sunday School Examination
        </p>
      </header>

      <main className={`flex-1 flex items-start justify-center px-4 pb-10 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        {children}
      </main>

      <footer className="text-center text-xs text-rfcm-charcoal/50 py-5 border-t border-rfcm-yellow-soft">
        © {new Date().getFullYear()} Reconciled Family of Christ Mission. All rights reserved.
        <br />
        Designed and developed by RFCM IT Department @2026
      </footer>
    </div>
  );
}


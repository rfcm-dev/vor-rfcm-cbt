"use client";

import { useEffect, useState } from "react";

export default function ExamCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`w-full max-w-sm bg-white/80 backdrop-blur-sm border border-rfcm-yellow-soft rounded-3xl shadow-xl shadow-rfcm-charcoal/5 p-8 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${className}`}>
      {children}
    </div>
  );
}


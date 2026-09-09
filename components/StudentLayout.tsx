import Image from "next/image";

// Shared shell for every student-facing page (landing, verify, instructions,
// exam, check-results). Deliberately plain and calm — no nav links to admin,
// no mention of teachers or accounts. A student should only ever see this.
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-rfcm-cream">
      <header className="flex flex-col items-center pt-10 pb-6 px-4 text-center">
        <div className="w-20 h-20 relative mb-3">
          <Image src="/logo.jpg" alt="RFCM logo" fill className="object-contain rounded-full" priority />
        </div>
        <p className="text-xs tracking-[0.2em] uppercase text-rfcm-red font-semibold">
          Reconciled Family of Christ Mission
        </p>
        <h1 className="font-serif text-3xl font-bold text-rfcm-charcoal mt-1">RFCM CBT</h1>
        <p className="text-sm text-rfcm-charcoal/60 mt-0.5">Sunday School Examination</p>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pb-10">{children}</main>

      <footer className="text-center text-xs text-rfcm-charcoal/50 py-5 border-t border-rfcm-yellow-soft">
        © {new Date().getFullYear()} Reconciled Family of Christ Mission. All rights reserved.
        <br />
        Designed and developed by RFCM IT Department @2026
      </footer>
    </div>
  );
}

"use client";

export default function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-rfcm-yellow-soft p-5 shadow-sm ${className}`}>
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-rfcm-cream-dark rounded w-1/2" />
        <div className="h-8 bg-rfcm-cream-dark rounded w-1/3" />
        <div className="h-3 bg-rfcm-cream-dark rounded w-2/3" />
      </div>
    </div>
  );
}

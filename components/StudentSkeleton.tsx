"use client";

export default function StudentSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-sm bg-white/80 backdrop-blur-sm border border-rfcm-yellow-soft rounded-3xl shadow-xl p-8 ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-rfcm-cream-dark rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-rfcm-cream-dark rounded w-1/2 mx-auto"></div>
        <div className="space-y-3 pt-4">
          <div className="h-12 bg-rfcm-cream-dark rounded-xl"></div>
          <div className="h-12 bg-rfcm-cream-dark rounded-xl"></div>
          <div className="h-12 bg-rfcm-cream-dark rounded-xl"></div>
        </div>
        <div className="h-12 bg-rfcm-cream-dark rounded-xl mt-6"></div>
      </div>
    </div>
  );
}

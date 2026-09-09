export default function ExamCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-sm bg-white border border-rfcm-yellow-soft rounded-2xl shadow-sm p-8 ${className}`}>
      {children}
    </div>
  );
}

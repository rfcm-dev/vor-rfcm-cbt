// Simple percentage -> letter grade mapping for the result-checking page.
export function scoreToGrade(percentage: number): string {
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

// Auto-scoring for objective question types. Essay questions always
// return null — they wait in the manual grading queue.
type Question = {
  id: string;
  type: "mcq" | "true_false" | "fill_blank" | "essay";
  correct_answer: string | null;
  points: number;
};

export function autoScore(question: Question, response: string | null): number | null {
  if (question.type === "essay") return null;
  if (!response) return 0;

  const normalize = (s: string) => s.trim().toLowerCase();

  if (question.type === "mcq" || question.type === "true_false") {
    return normalize(response) === normalize(question.correct_answer ?? "") ? question.points : 0;
  }

  if (question.type === "fill_blank") {
    // Exact match after normalization. Consider fuzzy/alternate-answer matching later.
    return normalize(response) === normalize(question.correct_answer ?? "") ? question.points : 0;
  }

  return null;
}

export function computeAttemptStatus(hasUngradedEssay: boolean): "pending_grading" | "graded" {
  return hasUngradedEssay ? "pending_grading" : "graded";
}

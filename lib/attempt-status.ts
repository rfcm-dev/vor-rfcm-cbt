import { calculatePercentage } from "./grading";
import { scoreToGrade } from "./grade";

export interface AttemptOverviewRow {
  attempt_id: string;
  test_id: string;
  student_id: string;
  test_title: string;
  student_name: string;
  class_id: string;
  class_name: string;
  attempt_status: string;
  result_status: string | null;
  total_score: number | null;
  released_at: string | null;
  started_at: string;
  submitted_at: string | null;
  time_limit_minutes: number;
  total_possible_points: number;
  essay_total: number;
  essays_graded: number;
}

export type AttemptViewStatus = 
  | 'in_progress' 
  | 'stuck' 
  | 'processing' 
  | 'awaiting_grading' 
  | 'ready_to_release' 
  | 'released';

export interface AttemptView {
  status: AttemptViewStatus;
  percentage: number | null;
  grade: string | null;
  isLate: boolean;
  lateMinutes: number;
  essaysGraded: number;
  essaysTotal: number;
  canRelease: boolean;
}

const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes, matches stuck-attempts page

export function deriveAttemptView(row: Partial<AttemptOverviewRow>): AttemptView {
  const now = Date.now();
  const startedAt = new Date(row.started_at ?? Date.now()).getTime();
  const timeLimitMinutes = row.time_limit_minutes ?? 30;
  const timeLimitMs = timeLimitMinutes * 60 * 1000;
  const deadline = startedAt + timeLimitMs;
  const isPastDeadline = now > deadline;
  const isStuck = row.attempt_status === "in_progress" && (now - startedAt) > STUCK_THRESHOLD_MS;

  let status: AttemptViewStatus;
  let isLate = false;
  let lateMinutes = 0;
  let percentage: number | null = null;
  let grade: string | null = null;
  let canRelease = false;

  if (row.attempt_status === "in_progress") {
    status = isStuck ? "stuck" : "in_progress";
  } else if (row.attempt_status === "submitted" || row.attempt_status === "auto_submitted") {
    if (!row.result_status) {
      status = "processing";
    } else if (row.result_status === "pending_grading") {
      status = "awaiting_grading";
    } else if (row.result_status === "graded") {
      status = "ready_to_release";
      canRelease = true;
      const totalPossible = (row.total_possible_points as number) || 0;
      const earned = row.total_score ?? 0;
      if (earned !== null && totalPossible > 0) {
        percentage = calculatePercentage(earned, totalPossible);
        grade = scoreToGrade(percentage);
      }
    } else if (row.result_status === "released") {
      status = "released";
      const totalPossible = (row.total_possible_points as number) || 0;
      const earned = row.total_score ?? 0;
      if (earned !== null && totalPossible > 0) {
        percentage = calculatePercentage(earned, totalPossible);
        grade = scoreToGrade(percentage);
      }
    } else {
      status = "processing";
    }

    if (row.submitted_at) {
      const submittedAt = new Date(row.submitted_at).getTime();
      isLate = submittedAt > deadline;
      lateMinutes = Math.max(0, Math.round((submittedAt - deadline) / 60000));
    }
  } else {
    status = "processing";
  }

  return {
    status,
    percentage,
    grade,
    isLate,
    lateMinutes,
    essaysGraded: row.essays_graded ?? 0,
    essaysTotal: row.essay_total ?? 0,
    canRelease,
  };
}

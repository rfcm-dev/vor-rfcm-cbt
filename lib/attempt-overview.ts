export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export interface AttemptOverviewFilters {
  testId?: string;
  classId?: string;
  studentId?: string;
  status?: string | string[];
  stuckOnly?: boolean;
  includeInProgress?: boolean;
  resultStatus?: string;
  limit?: number;
}

export async function getAttemptOverview(filters: AttemptOverviewFilters = {}) {
  let query = db
    .from("attempt_overview")
    .select("*")
    .order("started_at", { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.testId) {
    query = query.eq("test_id", filters.testId);
  }

  if (filters.classId) {
    query = query.eq("class_id", filters.classId);
  }

  if (filters.studentId) {
    query = query.eq("student_id", filters.studentId);
  }

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    if (statuses.length === 1) {
      query = query.eq("attempt_status", statuses[0]);
    } else {
      query = query.in("attempt_status", statuses);
    }
  } else if (!filters.includeInProgress && !filters.stuckOnly) {
    query = query.in("attempt_status", ["submitted", "auto_submitted"]);
  }

  if (filters.stuckOnly) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    query = query
      .eq("attempt_status", "in_progress")
      .lt("started_at", tenMinutesAgo);
  }

  if (filters.resultStatus) {
    query = query.eq("result_status", filters.resultStatus);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

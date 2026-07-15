const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RoadmapDay {
  id: string;
  day_number: number;
  topic: string;
  question_text: string;
  learning_goal: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  focus_skill: string | null;
  sent_at: string | null;
}

export interface RoadmapResponse {
  roadmap_id: string;
  interview_date: string;   // ISO date string, e.g. "2026-07-30"
  created_at: string;
  completed_count: number;  // 0 until answering flow is built
  days: RoadmapDay[];
}

// ── API call ───────────────────────────────────────────────────────────────────

export async function fetchRoadmap(
  token: string
): Promise<{ data?: RoadmapResponse; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/roadmap`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { status: res.status, error: (body as { error?: string }).error || 'Failed to fetch roadmap' };
    }

    return { status: res.status, data: body as RoadmapResponse };
  } catch {
    return { status: 0, error: 'Network error — make sure the backend server is running.' };
  }
}

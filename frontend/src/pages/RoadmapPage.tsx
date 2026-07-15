import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { fetchRoadmap, RoadmapDay, RoadmapResponse } from '../api/roadmap';
import { ChevronRight, RefreshCw, Upload } from 'lucide-react';

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
      <div className="flex gap-4">
        <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-20 h-7 bg-gray-200 rounded-full shrink-0 self-center" />
      </div>
    </div>
  );
}

// ── Difficulty badge ──────────────────────────────────────────────────────────

function DifficultyDot({ difficulty }: { difficulty: RoadmapDay['difficulty'] }) {
  const colors = {
    easy: 'bg-emerald-400',
    medium: 'bg-amber-400',
    hard: 'bg-rose-400',
  };
  const color = difficulty ? colors[difficulty] : 'bg-gray-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

// ── Day card ──────────────────────────────────────────────────────────────────

function DayCard({
  day,
  index,
  isToday,
  isNext,
  totalDays,
}: {
  day: RoadmapDay;
  index: number;
  isToday: boolean;
  isNext: boolean;
  totalDays: number;
}) {
  const navigate = useNavigate();
  const isLast = index === totalDays - 1;

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center w-10 shrink-0">
        {/* Circle marker */}
        {isToday ? (
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200 z-10">
            <div className="w-3 h-3 rounded-full bg-white" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center z-10">
            <span className="text-xs font-semibold text-gray-400">{day.day_number}</span>
          </div>
        )}
        {/* Dotted connector line */}
        {!isLast && (
          <div
            className="flex-1 w-px mt-1"
            style={{
              background: 'repeating-linear-gradient(to bottom, #d1d5db 0px, #d1d5db 4px, transparent 4px, transparent 10px)',
            }}
          />
        )}
      </div>

      {/* Card */}
      <div
        className={`flex-1 bg-white rounded-2xl border p-5 mb-4 transition-shadow hover:shadow-sm ${
          isToday
            ? 'border-emerald-200 shadow-sm'
            : 'border-gray-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Day label */}
            <div className="flex items-center gap-2 mb-1.5">
              <DifficultyDot difficulty={day.difficulty} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Day {day.day_number}
                {isToday && (
                  <span className="text-emerald-600 ml-1">· Today</span>
                )}
              </span>
            </div>

            {/* Topic title */}
            <h3 className="font-semibold text-gray-900 text-[15px] leading-snug mb-1">
              {day.topic}
            </h3>

            {/* Learning goal */}
            {day.learning_goal && (
              <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                {day.learning_goal}
              </p>
            )}

            {/* Focus skill pill */}
            {day.focus_skill && (
              <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                {day.focus_skill}
              </span>
            )}
          </div>

          {/* Status / CTA */}
          <div className="shrink-0 self-center ml-2">
            {isToday ? (
              <button
                onClick={() => {
                  // TODO: navigate to daily answering flow when built
                  // navigate(`/roadmap/day/${day.day_number}`);
                  console.log('[RoadmapPage] Start today clicked — daily flow not yet built.');
                  navigate(`/roadmap/day/${day.day_number}`);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-emerald-200"
              >
                Start today
                <ChevronRight size={14} />
              </button>
            ) : isNext ? (
              <span className="inline-flex items-center px-3 py-1.5 bg-violet-100 text-violet-600 text-xs font-semibold rounded-full">
                Up next
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-full">
                Locked
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Progress card ─────────────────────────────────────────────────────────────

function ProgressCard({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
        15-Day Sprint
      </p>
      <p className="text-2xl font-black text-gray-900 mb-3">
        <span className="text-emerald-600">{completed}</span>
        <span className="text-gray-300 font-medium"> / {total}</span>
        <span className="text-base font-semibold text-gray-500 ml-1">complete</span>
      </p>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── What we found card ────────────────────────────────────────────────────────

function WhatWeFoundCard({
  roadmap,
}: {
  roadmap: RoadmapResponse;
}) {
  const navigate = useNavigate();
  // Derive a short insight from the days (first day topic = biggest gap)
  const topicDay = roadmap.days[0];
  const insight = topicDay
    ? `Biggest gap: ${topicDay.focus_skill || topicDay.topic}`
    : 'Analysis complete';

  const description = roadmap.days[1]
    ? `Also focusing on ${roadmap.days[1]?.focus_skill || roadmap.days[1]?.topic} and ${roadmap.days[2]?.focus_skill || 'more'}.`
    : 'Your personalised plan is ready.';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-sm">AI</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
          What We Found
        </p>
        <p className="font-semibold text-gray-900 text-sm truncate">{insight}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{description}</p>
      </div>

      <button
        onClick={() => navigate('/upload')}
        className="shrink-0 text-xs font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap flex items-center gap-1 transition-colors"
      >
        Edit inputs →
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadRoadmap = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);

    const result = await fetchRoadmap(token);
    setLoading(false);

    if (result.status === 404) {
      setNotFound(true);
    } else if (result.error || !result.data) {
      setError(result.error ?? 'Unknown error');
    } else {
      setRoadmap(result.data);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, [token]);

  // Derive role title from first day's focus for fallback
  const roleTitle = null; // Would come from stored JD; using null triggers fallback

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
        {/* Header skeleton */}
        <div className="mb-8 space-y-2 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-9 bg-gray-200 rounded w-3/4" />
          <div className="h-9 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-64 mt-2" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // ── Not found / empty state ─────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Upload size={28} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No roadmap yet</h2>
          <p className="text-gray-500 max-w-sm">
            Upload your resume and job description to generate your personalised 15-day interview prep plan.
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          Upload documents →
        </button>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (error || !roadmap) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
          <RefreshCw size={28} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm max-w-sm">{error ?? 'Failed to load your roadmap.'}</p>
        </div>
        <button
          onClick={loadRoadmap}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }

  // ── Loaded state ────────────────────────────────────────────────────────────

  const { days, completed_count } = roadmap;
  const totalDays = days.length;
  const todayIndex = completed_count; // Day after last completed = today (0-indexed)
  const nextIndex = todayIndex + 1;

  // Derive role title for headline (fallback copy)
  const headlineRole = roleTitle ?? 'the role you want next';
  const subtitleRole = roleTitle ?? 'your target role';

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* ── Header section ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Your Personalized Path
          </p>
          <h1 className="font-fraunces text-4xl font-semibold text-gray-900 leading-[1.15] mb-3">
            Built around<br />
            {headlineRole}.
          </h1>
          <p className="text-gray-500 text-[15px]">
            A focused 15-day sprint for a {subtitleRole} interview.
          </p>
        </div>

        {/* Progress card — top right */}
        <div className="w-52 shrink-0">
          <ProgressCard completed={completed_count} total={totalDays} />
        </div>
      </div>

      {/* ── What we found ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <WhatWeFoundCard roadmap={roadmap} />
      </div>

      {/* ── 15-day timeline ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Your 15-Day Plan</h2>
        <div className="relative">
          {days.map((day, i) => (
            <DayCard
              key={day.id || day.day_number}
              day={day}
              index={i}
              isToday={i === todayIndex}
              isNext={i === nextIndex}
              totalDays={totalDays}
            />
          ))}
        </div>
      </div>

      {/* ── Bottom spacer ──────────────────────────────────────────────────── */}
      <div className="h-10" />
    </div>
  );
}

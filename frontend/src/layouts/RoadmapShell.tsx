import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  LayoutGrid,
  Map,
  MessageSquare,
  Plus,
  Bell,
  Settings,
  X,
  Flame,
  FileText,
} from 'lucide-react';

// ── Sidebar nav item ──────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
        active
          ? 'bg-emerald-50 text-emerald-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}
    >
      <span className={`${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'} transition-colors`}>
        {icon}
      </span>
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
    </button>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────────

export default function RoadmapShell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Derive user display info
  const email = user?.email ?? 'user@example.com';
  const namePart = email.split('@')[0];
  const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
  const initials = displayName.slice(0, 2).toUpperCase();

  // Today's date in long format
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-['Inter',sans-serif]">

      {/* ── Fixed Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-[230px] shrink-0 flex flex-col h-screen bg-white border-r border-gray-200 overflow-y-auto">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-bold text-gray-900 tracking-tight text-[15px]">PrepPilot</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Your Workspace
          </p>

          <NavItem
            icon={<LayoutGrid size={16} />}
            label="Overview"
            onClick={() => navigate('/dashboard')}
          />
          <NavItem
            icon={<FileText size={16} />}
            label="Analysis"
            onClick={() => navigate('/analysis')}
          />
          <NavItem
            icon={<Map size={16} />}
            label="Roadmap"
            active={true}
            onClick={() => navigate('/roadmap')}
          />
          <NavItem
            icon={<MessageSquare size={16} />}
            label="WhatsApp"
          />
          <button
            onClick={() => navigate('/upload')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150 mt-1"
          >
            <Plus size={16} className="text-gray-400" />
            New plan
          </button>
        </nav>

        {/* Streak nudge card */}
        <div className="mx-3 mb-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Keep the momentum</span>
          </div>
          <p className="text-[11px] text-emerald-600 leading-relaxed">
            Stay consistent — one day at a time builds real confidence for the interview.
          </p>
        </div>

        {/* Settings */}
        <div className="px-3 pb-2">
          <NavItem icon={<Settings size={16} />} label="Settings" />
        </div>

        {/* User row */}
        <div className="px-3 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 truncate">{displayName}</p>
              <p className="text-[11px] text-gray-400 truncate">Interview candidate</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              title="Back to dashboard"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-[58px] shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="font-medium text-gray-800">Your roadmap</span>
            <span className="text-gray-300">|</span>
            <span>{today}</span>
          </div>
          {/* Action icons */}
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors">
              <Bell size={15} />
            </button>
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors text-xs font-semibold">
              ?
            </button>
          </div>
        </header>

        {/* Page content via Outlet */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

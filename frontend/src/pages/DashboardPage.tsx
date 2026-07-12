import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { authApi, UserProfile } from '../api/auth';

export default function DashboardPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Verify token works by calling the protected endpoint
    authApi.getProfile(token).then(result => {
      setLoading(false);
      if (result.error || !result.data) {
        setProfileError(result.error || 'Failed to load profile');
        if (result.status === 401) {
          logout();
          navigate('/login');
        }
      } else {
        setProfile(result.data);
      }
    });
  }, [token, navigate, logout]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-10 h-10 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-gray-400">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-800 bg-gray-900/60 backdrop-blur-sm px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-white">PrepPilot</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.email}</span>
            <button
              id="logout-button"
              onClick={() => { logout(); navigate('/login'); }}
              className="text-sm text-gray-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-900/20"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back 👋
          </h1>
          <p className="text-gray-400">
            Your interview prep dashboard is ready. Phase 2 features (resume upload, roadmap, WhatsApp coaching) are coming next.
          </p>
        </div>

        {profileError && (
          <div className="error-banner mb-6">
            <span>{profileError}</span>
          </div>
        )}

        {/* Auth confirmation card */}
        <div className="card p-6 mb-6 border-green-800/40 bg-green-900/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-900/40 border border-green-800/50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-white mb-1">Auth flow verified ✓</h2>
              <p className="text-sm text-gray-400 mb-3">
                Your JWT was accepted by <code className="text-violet-400 bg-violet-900/30 px-1 py-0.5 rounded text-xs">GET /profile/me</code>. Here's what the protected endpoint returned:
              </p>
              {profile && (
                <div className="bg-gray-800/60 rounded-lg p-4 font-mono text-xs text-gray-300 space-y-1">
                  <div><span className="text-violet-400">id:</span> {profile.id}</div>
                  <div><span className="text-violet-400">email:</span> {profile.email}</div>
                  <div><span className="text-violet-400">whatsappNumber:</span> {profile.whatsappNumber ?? 'not set'}</div>
                  <div><span className="text-violet-400">createdAt:</span> {new Date(profile.createdAt).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Placeholder feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '📄', title: 'Upload Resume + JD', desc: 'Coming in Phase 2 — Claude will parse your documents and identify skill gaps.', status: 'Phase 2' },
            { icon: '🗺️', title: 'Roadmap Review', desc: 'Your personalised day-by-day prep plan will appear here once you upload your documents.', status: 'Phase 2' },
            { icon: '📱', title: 'WhatsApp Connect', desc: 'Connect your WhatsApp to start receiving daily targeted questions.', status: 'Phase 2' },
          ].map(card => (
            <div key={card.title} className="card p-6 opacity-60">
              <div className="text-3xl mb-3">{card.icon}</div>
              <div className="inline-block text-xs font-medium text-indigo-300 bg-indigo-900/30 border border-indigo-800/50 px-2 py-0.5 rounded-full mb-3">
                {card.status}
              </div>
              <h3 className="font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-gray-500">{card.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

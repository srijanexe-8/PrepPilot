import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuth } from '../store/AuthContext';

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
        <span className="text-white font-bold text-lg">P</span>
      </div>
      <span className="text-2xl font-bold text-white tracking-tight">PrepPilot</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-banner" role="alert" aria-live="assertive">
      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await authApi.signup(email, password);
    setLoading(false);

    if (result.error || !result.data) {
      if (result.status === 409) {
        setError('An account with this email already exists. Try logging in instead.');
      } else if (result.status === 400) {
        setError(result.error || 'Please check the form and try again.');
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
      }
      return;
    }

    login(result.data.token, result.data.user);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Logo />

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-gray-400 text-sm mb-8">
            Start your personalised interview prep today.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" id="signup-form" noValidate>
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                className="input-field"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
                <span className="ml-2 text-xs text-gray-500 font-normal">(minimum 8 characters)</span>
              </label>
              <input
                id="signup-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <ErrorBanner message={error} />}

            <button
              id="signup-submit"
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" id="go-to-login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          By signing up you agree to our Terms. No spam — only your coach.
        </p>
      </div>
    </div>
  );
}

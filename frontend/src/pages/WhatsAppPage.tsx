import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Info, Unlink, Loader2, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../store/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ── WhatsApp SVG Icon ─────────────────────────────────────────────────────────

function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.135.565 4.14 1.548 5.874L0 24l6.337-1.524A11.936 11.936 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.386l-.36-.214-3.762.906.948-3.659-.235-.376A9.818 9.818 0 012.182 12c0-5.419 4.399-9.818 9.818-9.818 5.419 0 9.818 4.399 9.818 9.818 0 5.419-4.399 9.818-9.818 9.818z" />
    </svg>
  );
}

// ── Real QR Code (encodes the wa.me deep link) ───────────────────────────────

function WhatsAppQRCode({ waLink }: { waLink: string }) {
  return (
    <QRCodeSVG
      value={waLink}
      size={100}
      bgColor="#ffffff"
      fgColor="#1a5c45"
      level="M"
    />
  );
}

// ── Steps list ────────────────────────────────────────────────────────────────

function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold flex items-center justify-center shrink-0">
        {number}
      </span>
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface SandboxInfo {
  sandboxNumber: string;
  joinKeyword: string;
  waLink: string;
}

export default function WhatsAppPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [sandboxInfo, setSandboxInfo] = useState<SandboxInfo | null>(null);
  const [connected, setConnected] = useState<string | null>(null); // saved number if already connected
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch sandbox info + current user profile on mount
  useEffect(() => {
    // Sandbox info (no auth needed)
    fetch(`${API_BASE}/api/whatsapp/sandbox-info`)
      .then((r) => r.json())
      .then((data: SandboxInfo) => setSandboxInfo(data))
      .catch(() => {});

    // User profile to check if already connected
    if (token) {
      fetch(`${API_BASE}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data: { whatsappNumber?: string }) => {
          if (data.whatsappNumber) {
            setConnected(data.whatsappNumber);
            setPhone(data.whatsappNumber);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const joinKeyword = sandboxInfo?.joinKeyword ?? 'join grew-worry';
  const waLink = sandboxInfo?.waLink ?? `https://wa.me/14155238886?text=${encodeURIComponent('join grew-worry')}`;

  const handleConnect = async () => {
    setError(null);
    if (!phone.trim()) {
      setError('Please enter your WhatsApp number.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/profile/whatsapp`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ whatsapp_number: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save number.');
        return;
      }
      setConnected(phone.trim());
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      await fetch(`${API_BASE}/profile/whatsapp`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnected(null);
      setPhone('');
      setSuccess(false);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = !!connected;

  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-full">
      {/* Card wrapper */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex">

          {/* ── Left panel ──────────────────────────────────────────────────── */}
          <div className="flex-1 p-10">
            {/* WhatsApp icon badge */}
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mb-6 shadow-md">
              <WhatsAppIcon size={26} />
            </div>

            {/* Tag */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-2">
              WhatsApp Coaching
            </p>

            {/* Headline */}
            <h1 className="text-3xl font-black text-gray-900 leading-tight mb-3">
              Meet your coach where<br />you already are.
            </h1>

            {/* Connected state */}
            {isConnected ? (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">
                    Connected — {connected}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-5 max-w-sm">
                  You'll receive your daily interview question on WhatsApp every morning.
                  Make sure you've sent <span className="font-mono font-semibold text-gray-700">"{joinKeyword}"</span> to{' '}
                  <span className="font-mono font-semibold text-gray-700">+1 415 523 8886</span> to activate delivery.
                </p>
                <button
                  id="whatsapp-disconnect-btn"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all disabled:opacity-60"
                >
                  {disconnecting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Unlink size={14} />
                  )}
                  Disconnect WhatsApp
                </button>
              </div>
            ) : (
              <>
                {/* Subtitle */}
                <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-sm">
                  Enter your WhatsApp number, then{' '}
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 underline hover:text-emerald-700 transition-colors"
                  >
                    join the sandbox
                  </a>{' '}
                  on your phone.
                </p>

                {/* Phone input */}
                <div className="mb-6">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    WhatsApp Number (E.164)
                  </label>
                  <input
                    id="whatsapp-phone-input"
                    type="tel"
                    placeholder="+91 9599028724"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(null); }}
                    className="w-full max-w-xs px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  />
                  <p className="text-[11px] text-gray-400 mt-1.5">Include country code — e.g. <span className="font-mono">+91</span> for India</p>
                  {error && (
                    <div className="flex items-center gap-1.5 mt-2 text-red-500 text-xs">
                      <AlertCircle size={12} />
                      {error}
                    </div>
                  )}
                </div>

                {/* Steps */}
                <div className="space-y-3 mb-8">
                  <StepItem number={1} text="Scan the QR code → WhatsApp opens with join message pre-filled" />
                  <StepItem number={2} text={`Tap Send — you'll get a confirmation from Twilio`} />
                  <StepItem number={3} text="Enter and connect the same number above" />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    id="whatsapp-connect-btn"
                    onClick={handleConnect}
                    disabled={saving || !phone.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : success ? (
                      <CheckCircle2 size={15} />
                    ) : null}
                    {saving ? 'Connecting…' : 'Connect this number'}
                  </button>
                  <button
                    id="whatsapp-skip-btn"
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Maybe later
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Right panel ─────────────────────────────────────────────────── */}
          <div className="w-[240px] shrink-0 bg-emerald-50/60 border-l border-gray-100 flex flex-col items-center justify-center p-8 gap-4">
            {/* Real scannable QR code — encodes the wa.me join link */}
            <a href={waLink} target="_blank" rel="noopener noreferrer" title="Scan to open WhatsApp">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <WhatsAppQRCode waLink={waLink} />
              </div>
            </a>

            {/* Label */}
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 mb-1">Scan to join PrepPilot</p>
              <p className="text-[11px] text-gray-500 leading-relaxed text-center">
                Use your phone camera or WhatsApp's QR scanner
              </p>
              {sandboxInfo && (
                <p className="text-[10px] font-mono text-emerald-700 mt-2 bg-emerald-50 px-2 py-1 rounded">
                  {sandboxInfo.joinKeyword}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="flex items-start gap-2 mt-4 px-1">
          <Info size={13} className="text-gray-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Uses the Twilio WhatsApp Sandbox — free for testing. Each user must send{' '}
            <span className="font-mono">"{joinKeyword}"</span> to activate message delivery.
          </p>
        </div>
      </div>
    </div>
  );
}

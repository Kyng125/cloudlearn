import { useState } from 'react';
import { useApp } from '../context';
import { Button, Input, Field } from '../components/UI';

const DEMO_ACCOUNTS = [
  { role: '🎓 Student', email: 'student@cloudlearn.com', password: 'demo123' },
  { role: '👨‍🏫 Instructor', email: 'instructor@cloudlearn.com', password: 'demo123' },
  { role: '⚙️ Admin', email: 'admin@cloudlearn.com', password: 'demo123' },
];

export function Login() {
  const { login, navigate } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const ok = login(email, password);
    setLoading(false);
    if (!ok) setError('Invalid email or password, or the account is deactivated. Try the demo accounts below.');
  };

  const quickLogin = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-blue-900/40 to-[#0b1120] p-12 border-r border-[rgba(255,255,255,0.07)]">
        <button onClick={() => navigate('landing')} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-display font-bold">C</span>
          </div>
          <span className="font-display font-bold text-[#f0f4ff] text-xl">CloudLearn</span>
        </button>
        <div>
          <h2 className="font-display font-bold text-4xl text-[#f0f4ff] mb-4 leading-tight">Welcome back to your learning journey</h2>
          <p className="text-[#6b7fa8] text-lg leading-relaxed">Access your courses, track your progress, and continue building skills that matter.</p>
          <ul className="mt-8 space-y-3 text-[#a0b4d0]">
            {['Course materials, assignments and quizzes in one place', 'Separate workspaces for students, instructors and administrators', 'Works on desktop and mobile browsers'].map(t => (
              <li key={t} className="flex items-start gap-3"><span className="text-blue-400">✓</span><span>{t}</span></li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-[#4a5a7a]">CloudLearn · HND Computer Science seminar project</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-display font-bold text-[#f0f4ff] text-lg">CloudLearn</span>
          </div>

          <h1 className="font-display font-bold text-3xl text-[#f0f4ff] mb-2">Sign in</h1>
          <p className="text-[#6b7fa8] mb-8">Enter your credentials to access your account</p>

          {/* Demo accounts */}
          <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <p className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wider">Demo Accounts — click to fill</p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(d => (
                <button key={d.email} onClick={() => quickLogin(d.email, d.password)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm transition-colors text-left">
                  <span className="text-[#f0f4ff]">{d.role}</span>
                  <span className="font-mono text-xs text-[#4a5a7a]">{d.email}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="Email address" required>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </Field>
            <Field label="Password" required>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </Field>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
            )}

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => navigate('forgot-password')} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full justify-center" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6b7fa8]">
            {"Don't have an account? "}
            <button onClick={() => navigate('register')} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Create one</button>
          </p>
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const { register, navigate } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const ok = register(name, email, password, role);
    setLoading(false);
    if (!ok) setError('An account with this email already exists');
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button onClick={() => navigate('landing')} className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-display font-bold text-[#f0f4ff] text-lg">CloudLearn</span>
        </button>

        <h1 className="font-display font-bold text-3xl text-[#f0f4ff] mb-2">Create account</h1>
        <p className="text-[#6b7fa8] mb-8">Create your CloudLearn account</p>

        {/* Role selector */}
        <div className="flex gap-3 mb-6">
          {[{ id: 'student', label: '🎓 Student', desc: 'I want to learn' }, { id: 'instructor', label: '👨‍🏫 Instructor', desc: 'I want to teach' }].map(r => (
            <button key={r.id} onClick={() => setRole(r.id as any)}
              className={`flex-1 p-3 rounded-xl border text-left transition-all ${role === r.id ? 'border-blue-500 bg-blue-500/10' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'}`}>
              <div className="font-medium text-[#f0f4ff] text-sm">{r.label}</div>
              <div className="text-xs text-[#6b7fa8]">{r.desc}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Field label="Full name" required>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" required />
          </Field>
          <Field label="Email address" required>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </Field>
          <Field label="Password" required>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </Field>
          <Field label="Confirm password" required>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
          </Field>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}

          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account →'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6b7fa8]">
          Already have an account?{' '}
          <button onClick={() => navigate('login')} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in</button>
        </p>
      </div>
    </div>
  );
}

export function ForgotPassword() {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button onClick={() => navigate('login')} className="text-sm text-[#6b7fa8] hover:text-white mb-8 flex items-center gap-2 transition-colors">← Back to sign in</button>
        <h1 className="font-display font-bold text-3xl text-[#f0f4ff] mb-2">Reset password</h1>
        <p className="text-[#6b7fa8] mb-8">{"Enter your email and we'll send you a reset link"}</p>
        {sent ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            If an account exists for <strong>{email}</strong>, you will receive a password reset email shortly.
            <button onClick={() => navigate('login')} className="block mt-4 text-blue-400 hover:text-blue-300 transition-colors">Back to sign in →</button>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="space-y-4">
            <Field label="Email address" required>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </Field>
            <Button type="submit" className="w-full justify-center">Send reset link</Button>
          </form>
        )}
      </div>
    </div>
  );
}

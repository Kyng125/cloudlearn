import { useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { useApp } from '../context';

// ── Button ──────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500',
  secondary: 'bg-[#1f2d4a] hover:bg-[#253558] text-[#a0b4d0] border border-[rgba(255,255,255,0.08)]',
  ghost: 'bg-transparent hover:bg-[rgba(255,255,255,0.05)] text-[#a0b4d0] border border-transparent',
  danger: 'bg-red-600 hover:bg-red-500 text-white border border-red-500',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500',
  outline: 'bg-transparent hover:bg-[rgba(255,255,255,0.05)] text-blue-400 border border-blue-500',
};

const sizeClasses: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary', size = 'md', className = '', children, disabled, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-[#111827] border border-[rgba(255,255,255,0.07)] rounded-xl ${onClick ? 'cursor-pointer hover:border-[rgba(255,255,255,0.14)] transition-all' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────

type BadgeVariant = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray' | 'cyan';

const badgeColors: Record<BadgeVariant, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export function Badge({ children, variant = 'blue', className = '' }: { children: ReactNode; variant?: BadgeVariant; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${badgeColors[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff] placeholder-[#4a5a7a] transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff] placeholder-[#4a5a7a] transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 resize-none ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={`w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff] transition-all focus:outline-none focus:border-blue-500 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative w-full ${sizes[size]} bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.07)]">
          <h3 className="font-display font-bold text-lg text-[#f0f4ff]">{title}</h3>
          <button onClick={onClose} className="text-[#6b7fa8] hover:text-white transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Toast Container ──────────────────────────────────────────────────────────

const toastStyles: Record<string, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  error: 'bg-red-500/10 border-red-500/30 text-red-300',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
};

const toastIcons: Record<string, string> = {
  success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
};

export function ToastContainer() {
  const { toasts, removeToast } = useApp();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg ${toastStyles[t.type]} animate-[slideIn_0.2s_ease]`}>
          <span className="text-base">{toastIcons[t.type]}</span>
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────

export function ProgressBar({ value, max = 100, color = 'blue', showLabel = false }: {
  value: number; max?: number; color?: 'blue' | 'green' | 'yellow' | 'purple'; showLabel?: boolean;
}) {
  const pct = Math.round((value / max) * 100);
  const colors = { blue: 'bg-blue-500', green: 'bg-emerald-500', yellow: 'bg-amber-500', purple: 'bg-purple-500' };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1a2540] rounded-full overflow-hidden">
        <div className={`h-full ${colors[color]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs font-mono text-[#6b7fa8] w-8 text-right">{pct}%</span>}
    </div>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────────

export function Avatar({ src, name, size = 32 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-amber-600', 'bg-pink-600'];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img src={src} alt={name} onError={() => setFailed(true)} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className={`flex items-center justify-center rounded-full text-white font-bold ${colors[colorIdx]}`} style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, icon, color = 'blue' }: {
  label: string; value: string | number; sub?: string; icon: string; color?: 'blue' | 'green' | 'yellow' | 'purple' | 'cyan' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-emerald-500/10 text-emerald-400',
    yellow: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    red: 'bg-red-500/10 text-red-400',
  };
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${colors[color]}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-display font-bold text-[#f0f4ff]">{value}</div>
        <div className="text-sm text-[#6b7fa8]">{label}</div>
        {sub && <div className="text-xs text-[#4a5a7a] mt-0.5">{sub}</div>}
      </div>
    </Card>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="font-display font-bold text-lg text-[#f0f4ff] mb-2">{title}</div>
      {description && <div className="text-sm text-[#6b7fa8] max-w-xs mb-4">{description}</div>}
      {action}
    </div>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────

export function Table({ headers, rows, className = '' }: {
  headers: string[];
  rows: (string | ReactNode)[][];
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.07)]">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-[#e5eaf7]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────

export function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto max-w-full bg-[#0b1120] p-1 rounded-lg border border-[rgba(255,255,255,0.07)]">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex shrink-0 whitespace-nowrap items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${active === tab.id ? 'bg-blue-600 text-white' : 'text-[#6b7fa8] hover:text-[#f0f4ff]'}`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${active === tab.id ? 'bg-blue-400/30' : 'bg-[#1a2540]'}`}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Form Field ──────────────────────────────────────────────────────────────

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#a0b4d0]">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#4a5a7a]">{hint}</p>}
    </div>
  );
}

// ── Confirm Dialog ──────────────────────────────────────────────────────────

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger' }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string;
  confirmLabel?: string; variant?: 'danger' | 'primary';
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-[#a0b4d0] mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ── Loading Spinner ──────────────────────────────────────────────────────────

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin text-blue-400">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Search Input ──────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5a7a]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff] placeholder-[#4a5a7a] focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────────────

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-display font-bold text-[#f0f4ff]">{title}</h2>
        {description && <p className="text-sm text-[#6b7fa8] mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Level Badge ──────────────────────────────────────────────────────────

export function LevelBadge({ level }: { level: string }) {
  const map: Record<string, BadgeVariant> = { Beginner: 'green', Intermediate: 'yellow', Advanced: 'red' };
  return <Badge variant={map[level] || 'gray'}>{level}</Badge>;
}

// ── Star Rating ──────────────────────────────────────────────────────────

export function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
      <span className="text-xs text-[#6b7fa8] ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastItem, useStore } from '../../store/useStore';

function ToastCard({ toast }: { toast: ToastItem }) {
  const removeToast = useStore((state) => state.removeToast);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      removeToast(toast.id);
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [removeToast, toast.id]);

  const style =
    toast.type === 'success'
      ? {
          icon: CheckCircle2,
          iconClass: 'text-emerald-400',
          border: 'border-emerald-700/60',
          bg: 'bg-emerald-900/20',
        }
      : toast.type === 'error'
      ? {
          icon: AlertCircle,
          iconClass: 'text-red-400',
          border: 'border-red-700/60',
          bg: 'bg-red-900/20',
        }
      : {
          icon: Info,
          iconClass: 'text-emerald-400',
          border: 'border-emerald-700/60',
          bg: 'bg-emerald-900/20',
        };

  const Icon = style.icon;

  return (
    <div className={`toast-enter rounded-xl border ${style.border} ${style.bg} backdrop-blur-md p-3 shadow-xl`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 mt-0.5 ${style.iconClass}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{toast.title}</p>
          {toast.message && <p className="text-xs text-slate-300 mt-1">{toast.message}</p>}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useStore((state) => state.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-[70] top-4 right-4 w-[340px] max-w-[calc(100vw-2rem)] space-y-2 pointer-events-auto">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}


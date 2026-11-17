import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';

export function ToastContainer() {
  const { toasts } = useStore();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-rose-950 text-white border-rose-800'
              : toast.type === 'info'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-[#172337] text-white border-slate-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="w-4 h-4 text-[#FFE500] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="leading-snug">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

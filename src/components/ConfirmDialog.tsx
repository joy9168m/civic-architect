import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: 'error' | 'primary';
  icon?: React.ReactNode;
  /** If set, user must type this exact string before confirming */
  confirmText?: string;
  confirmTextValue?: string;
  onConfirmTextChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm',
  confirmColor = 'error',
  icon,
  confirmText, confirmTextValue, onConfirmTextChange,
  onConfirm, onCancel, loading,
}: ConfirmDialogProps) {
  const colorClasses = confirmColor === 'error'
    ? 'bg-error text-white hover:bg-error/90'
    : 'bg-primary text-white hover:bg-primary-container';

  const isDisabled = loading || (confirmText ? confirmTextValue !== confirmText : false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className={`flex items-center gap-4 mb-4 ${confirmColor === 'error' ? 'text-error' : 'text-primary'}`}>
              {icon || <AlertTriangle size={32} />}
              <h2 className="font-headline text-2xl font-black">{title}</h2>
            </div>
            <p className="text-on-surface-variant mb-6 font-medium">{message}</p>

            {confirmText && (
              <div className="mb-6">
                <label className="text-xs font-black uppercase text-outline tracking-widest block mb-2">
                  Type "{confirmText}" to proceed
                </label>
                <input
                  type="text"
                  value={confirmTextValue || ''}
                  onChange={(e) => onConfirmTextChange?.(e.target.value)}
                  className="w-full bg-surface-container-lowest border-2 border-error/30 rounded-xl px-4 py-3 font-bold text-error outline-none focus:border-error transition-colors"
                  placeholder={confirmText}
                />
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-outline hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDisabled}
                className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${colorClasses}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

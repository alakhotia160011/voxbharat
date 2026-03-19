import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../hooks/useToast';

const typeStyles = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-earth',
  warning: 'bg-gold',
};

export default function Toaster() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto px-4 py-3 rounded-lg text-white text-sm font-body shadow-lg max-w-sm ${typeStyles[t.type] || typeStyles.info}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

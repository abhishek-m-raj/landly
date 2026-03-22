"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthGateModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative mx-4 w-full max-w-sm rounded-(--radius-land) border border-landly-slate/15 bg-landly-navy-deep p-8 text-center shadow-2xl"
        >
          {/* close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-landly-slate hover:text-landly-offwhite transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-landly-gold/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-landly-gold">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h3 className="mt-5 font-sans text-lg font-semibold text-landly-offwhite">
            Sign in to invest
          </h3>
          <p className="mt-2 text-sm text-landly-slate">
            Please log in or sign up to start investing in properties.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/login"
              className="block w-full rounded-(--radius-land) bg-landly-green py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="block w-full rounded-(--radius-land) border border-landly-slate/20 py-3 text-sm font-semibold text-landly-offwhite transition-all hover:border-landly-slate/40"
            >
              Sign up
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

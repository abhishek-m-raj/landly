"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";

type PropertyType = "agricultural" | "residential" | "commercial";

interface FormData {
  title: string;
  location: string;
  type: PropertyType;
  description: string;
  total_value: string;
  total_shares: string;
  share_price: string;
}

const STEPS = ["Basics", "Details", "Review"] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
});

const TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "agricultural", label: "Agricultural" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
];

export default function ListPropertyPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    title: "",
    location: "",
    type: "residential",
    description: "",
    total_value: "",
    total_shares: "",
    share_price: "",
  });

  const update = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const canNext =
    step === 0
      ? form.title && form.location && form.type
      : step === 1
        ? form.description && form.total_value && form.total_shares && form.share_price
        : true;

  const handleSubmit = async () => {
    if (!userId || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/properties/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: userId,
          title: form.title,
          location: form.location,
          type: form.type,
          description: form.description,
          totalValue: Number(form.total_value),
          totalShares: Number(form.total_shares),
          sharePrice: Number(form.share_price),
          imageUrl: "",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setSubmitError(data.error || "Failed to submit listing");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  const inputClass =
    "w-full rounded-[var(--radius-land)] border border-landly-slate/20 bg-landly-navy-deep/60 px-4 py-3 text-sm text-landly-offwhite placeholder:text-landly-slate/50 focus:border-landly-gold/50 focus:outline-none focus:ring-1 focus:ring-landly-gold/30 transition-colors";

  return (
    <div className="flex min-h-svh flex-col bg-landly-navy">
      <Navbar />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pt-24 pb-16 md:pt-28">
        {submitted ? (
          /* Success state */
          <motion.div
            className="flex flex-col items-center justify-center py-24 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-landly-green/15"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <svg className="h-10 w-10 text-landly-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h2 className="font-sans text-2xl font-bold text-landly-offwhite">Property Submitted</h2>
            <p className="mt-2 max-w-sm text-sm text-landly-slate">
              Your listing for <span className="text-landly-gold">{form.title}</span> is under review. You&apos;ll be notified once it&apos;s approved.
            </p>
          </motion.div>
        ) : (
          <>
            <motion.h1
              className="font-sans text-3xl font-bold text-landly-offwhite"
              {...fadeUp()}
            >
              List a Property
            </motion.h1>

            {/* progress steps */}
            <motion.div className="mt-8 flex items-center gap-2" {...fadeUp(0.05)}>
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <button
                    onClick={() => i < step && setStep(i)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      i <= step
                        ? "bg-landly-gold text-landly-navy-deep"
                        : "border border-landly-slate/20 text-landly-slate"
                    }`}
                  >
                    {i + 1}
                  </button>
                  <span
                    className={`text-sm font-medium ${
                      i <= step ? "text-landly-offwhite" : "text-landly-slate/50"
                    }`}
                  >
                    {s}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px w-8 ${i < step ? "bg-landly-gold/50" : "bg-landly-slate/15"}`} />
                  )}
                </div>
              ))}
            </motion.div>

            {/* form steps */}
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="step-0" className="mt-10 space-y-5" {...fadeUp(0.1)}>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                      Property Title
                    </label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Kochi Residential Flat"
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                      Location
                    </label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Marine Drive, Kochi, Kerala"
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                      Property Type
                    </label>
                    <div className="flex gap-3">
                      {TYPE_OPTIONS.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => update("type", t.value)}
                          className={`flex-1 rounded-[var(--radius-land)] border px-4 py-3 text-sm font-medium transition-all ${
                            form.type === t.value
                              ? "border-landly-gold/60 bg-landly-gold/10 text-landly-gold"
                              : "border-landly-slate/15 text-landly-slate hover:border-landly-slate/30"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="step-1" className="mt-10 space-y-5" {...fadeUp(0.1)}>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                      Description
                    </label>
                    <textarea
                      className={`${inputClass} min-h-[100px] resize-none`}
                      placeholder="Describe the property, area, nearby amenities…"
                      value={form.description}
                      onChange={(e) => update("description", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                        Total Value (₹)
                      </label>
                      <input
                        className={inputClass}
                        type="number"
                        placeholder="500000"
                        value={form.total_value}
                        onChange={(e) => update("total_value", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                        Total Shares
                      </label>
                      <input
                        className={inputClass}
                        type="number"
                        placeholder="1000"
                        value={form.total_shares}
                        onChange={(e) => update("total_shares", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                        Price per Share (₹)
                      </label>
                      <input
                        className={inputClass}
                        type="number"
                        placeholder="500"
                        value={form.share_price}
                        onChange={(e) => update("share_price", e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step-2" className="mt-10" {...fadeUp(0.1)}>
                  <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/40 p-6">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-landly-slate">Review Listing</h3>
                    <div className="mt-5 space-y-4">
                      {[
                        { label: "Title", value: form.title },
                        { label: "Location", value: form.location },
                        { label: "Type", value: form.type.charAt(0).toUpperCase() + form.type.slice(1) },
                        { label: "Total Value", value: `₹${Number(form.total_value).toLocaleString("en-IN")}` },
                        { label: "Total Shares", value: form.total_shares },
                        { label: "Price / Share", value: `₹${Number(form.share_price).toLocaleString("en-IN")}` },
                      ].map((row) => (
                        <div key={row.label} className="flex items-baseline justify-between border-b border-landly-slate/5 pb-3">
                          <span className="text-xs uppercase tracking-wider text-landly-slate">{row.label}</span>
                          <span className="font-mono text-sm text-landly-offwhite">{row.value}</span>
                        </div>
                      ))}
                      <div>
                        <span className="text-xs uppercase tracking-wider text-landly-slate">Description</span>
                        <p className="mt-1 text-sm text-landly-offwhite/80">{form.description}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* navigation buttons */}
            <motion.div className="mt-8 flex justify-between" {...fadeUp(0.15)}>
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-sm font-medium text-landly-slate hover:text-landly-offwhite transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => canNext && setStep(step + 1)}
                  disabled={!canNext}
                  className="rounded-[var(--radius-land)] bg-landly-gold px-8 py-3 text-sm font-semibold text-landly-navy-deep transition-all hover:bg-landly-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-[var(--radius-land)] bg-landly-green px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-landly-green/90 disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Submit for Review"}
                </button>
              )}
            </motion.div>

            {submitError && (
              <p className="mt-3 text-center text-sm text-landly-red">{submitError}</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

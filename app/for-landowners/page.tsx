"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/app/components/Navbar";
import { useAuth } from "@/app/components/AuthProvider";

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay },
  },
});

const ownerSteps = [
  {
    num: "01",
    title: "Tell us about the asset",
    desc: "Share the location, category, valuation, and how much ownership you want to unlock.",
  },
  {
    num: "02",
    title: "Upload verification documents",
    desc: "Landly reviews title, survey, and legal records before presenting the opportunity to investors.",
  },
  {
    num: "03",
    title: "We structure the listing",
    desc: "Your asset is divided into fractional units with a clear share price and funding target.",
  },
  {
    num: "04",
    title: "Unlock capital",
    desc: "Once live, investors participate and you can track status, progress, and capital raised.",
  },
];

const requiredDocuments = [
  "Title deed or proof of ownership",
  "Latest survey or land measurement report",
  "Government ID and contact details",
  "Basic legal clearance or supporting compliance records",
];

const feeNotes = [
  {
    label: "Listing review",
    value: "No upfront platform fee during submission",
  },
  {
    label: "When Landly earns",
    value: "A success-based fee after your property is approved and funded",
  },
  {
    label: "What you keep",
    value: "You choose how much ownership to retain before the listing goes live",
  },
];

export default function ForLandownersPage() {
  const { user } = useAuth();
  const primaryCtaHref = user ? "/list-property" : "/login";
  const primaryCtaLabel = user ? "Start Your Listing" : "Log In to Start";

  return (
    <div className="min-h-svh bg-landly-navy text-landly-offwhite">
      <Navbar />

      <main className="overflow-x-hidden pt-24 md:pt-28">
        <section className="relative overflow-hidden px-6 pb-24 pt-10 md:px-12 md:pb-32 md:pt-16">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-landly-navy-deep via-landly-navy to-landly-navy" />
          <div className="absolute left-1/2 top-0 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-landly-gold/8 blur-[140px]" />
          <div className="absolute right-0 top-24 -z-10 h-64 w-64 rounded-full bg-landly-green/10 blur-[120px]" />

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"
          >
            <div>
              <motion.p
                variants={fadeUp(0)}
                className="text-sm font-semibold uppercase tracking-[0.2em] text-landly-gold"
              >
                For Landowners
              </motion.p>
              <motion.h1
                variants={fadeUp(0.08)}
                className="mt-4 max-w-3xl font-sans text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
              >
                Unlock liquidity from your land without fully selling it.
              </motion.h1>
              <motion.p
                variants={fadeUp(0.16)}
                className="mt-6 max-w-2xl text-base leading-relaxed text-landly-slate md:text-lg"
              >
                Landly helps you turn part of an idle property into working capital while preserving the ownership you want to keep.
              </motion.p>
              <motion.div
                variants={fadeUp(0.24)}
                className="mt-10 flex flex-col gap-4 sm:flex-row"
              >
                <Link
                  href={primaryCtaHref}
                  className="inline-flex h-12 items-center justify-center rounded-[var(--radius-land)] bg-landly-green px-8 text-sm font-semibold text-white transition-all hover:brightness-110"
                >
                  {primaryCtaLabel}
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex h-12 items-center justify-center rounded-[var(--radius-land)] border border-landly-gold/40 px-8 text-sm font-semibold text-landly-gold transition-all hover:border-landly-gold hover:bg-landly-gold/5"
                >
                  See How Investors Browse
                </Link>
              </motion.div>
            </div>

            <motion.div
              variants={fadeUp(0.18)}
              className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/50 p-6 backdrop-blur-sm md:p-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-landly-gold">
                What happens after you submit
              </p>
              <div className="mt-6 space-y-5">
                {[
                  "Your listing enters review with title, survey, and legal checks.",
                  "Landly structures the investable portion and share price.",
                  "Approved properties are presented to investors in the marketplace.",
                  "You track status and capital raised as the listing moves forward.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-landly-green" />
                    <p className="text-sm leading-relaxed text-landly-offwhite/85">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className="px-6 py-20 md:px-12 md:py-24">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              <motion.p variants={fadeUp(0)} className="text-sm font-semibold uppercase tracking-[0.2em] text-landly-gold">
                Concise process
              </motion.p>
              <motion.h2 variants={fadeUp(0.08)} className="mt-3 font-sans text-3xl font-bold md:text-4xl">
                How listing works
              </motion.h2>
              <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {ownerSteps.map((step, index) => (
                  <motion.div
                    key={step.num}
                    variants={fadeUp(index * 0.06)}
                    className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/35 p-6"
                  >
                    <p className="font-mono text-3xl font-semibold text-landly-gold">{step.num}</p>
                    <h3 className="mt-4 font-sans text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-landly-slate">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-landly-slate/10 px-6 py-20 md:px-12 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              <motion.p variants={fadeUp(0)} className="text-sm font-semibold uppercase tracking-[0.2em] text-landly-gold">
                Documents required
              </motion.p>
              <motion.h2 variants={fadeUp(0.08)} className="mt-3 font-sans text-3xl font-bold md:text-4xl">
                Bring the basics. We handle the structure.
              </motion.h2>
              <motion.p variants={fadeUp(0.16)} className="mt-4 max-w-xl text-sm leading-relaxed text-landly-slate md:text-base">
                Judges and owners both need to see trust quickly. Landly keeps the requirements straightforward so genuine listings can move into review fast.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              className="space-y-4"
            >
              {requiredDocuments.map((item, index) => (
                <motion.div
                  key={item}
                  variants={fadeUp(index * 0.06)}
                  className="flex items-start gap-4 rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/35 p-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-landly-green/10 font-mono text-sm font-semibold text-landly-green">
                    0{index + 1}
                  </div>
                  <p className="pt-2 text-sm leading-relaxed text-landly-offwhite/85">{item}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="px-6 py-20 md:px-12 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              <motion.p variants={fadeUp(0)} className="text-sm font-semibold uppercase tracking-[0.2em] text-landly-gold">
                Fees and structure
              </motion.p>
              <motion.h2 variants={fadeUp(0.08)} className="mt-3 font-sans text-3xl font-bold md:text-4xl">
                Clear economics for owners.
              </motion.h2>
              <div className="mt-8 space-y-4">
                {feeNotes.map((note, index) => (
                  <motion.div
                    key={note.label}
                    variants={fadeUp(index * 0.06)}
                    className="flex items-baseline justify-between gap-6 border-b border-landly-slate/10 pb-4"
                  >
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-landly-slate">{note.label}</span>
                    <span className="max-w-xs text-right text-sm leading-relaxed text-landly-offwhite/85">{note.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp(0.12)}
              className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/45 p-6 md:p-8"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-landly-gold">After submission</p>
              <h3 className="mt-4 font-sans text-2xl font-bold">Your listing does not disappear into a black box.</h3>
              <p className="mt-4 text-sm leading-relaxed text-landly-slate md:text-base">
                Once submitted, the next phase is review, verification, structuring, and launch readiness. Owners should understand that Landly is not just a form. It is a pipeline from idle asset to investable opportunity.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  "Review",
                  "Verification",
                  "Marketplace launch",
                ].map((label) => (
                  <div key={label} className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy/60 px-4 py-4 text-center text-sm font-medium text-landly-offwhite/85">
                    {label}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-6 pb-20 md:px-12 md:pb-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="mx-auto max-w-5xl rounded-[var(--radius-land)] border border-landly-slate/10 bg-gradient-to-r from-landly-navy-deep to-landly-navy p-8 text-center md:p-12"
          >
            <motion.p variants={fadeUp(0)} className="text-sm font-semibold uppercase tracking-[0.2em] text-landly-gold">
              Ready to begin
            </motion.p>
            <motion.h2 variants={fadeUp(0.08)} className="mt-4 font-sans text-3xl font-bold md:text-4xl">
              Start with the property. We&apos;ll guide the rest.
            </motion.h2>
            <motion.p variants={fadeUp(0.16)} className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-landly-slate md:text-base">
              Landly exists to help owners unlock capital without a full exit. The first step is a clean listing with the right documents and the right share structure.
            </motion.p>
            <motion.div variants={fadeUp(0.24)} className="mt-8">
              <Link
                href={primaryCtaHref}
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius-land)] bg-landly-green px-8 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                {primaryCtaLabel}
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
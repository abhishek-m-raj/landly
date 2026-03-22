"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/* ── motion helpers ─────────────────────────────────── */
const fadeUp = (delay: number) => ({
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay },
  },
});

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

/* ── section reveal wrapper ────────────────────────── */
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── page ───────────────────────────────────────────── */
export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="flex flex-col overflow-x-hidden">
      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section
        ref={heroRef}
        className="relative flex min-h-svh items-center justify-center overflow-hidden"
      >
        {/* background layer — deep gradient + subtle grid */}
        <motion.div
          style={{ y: heroY }}
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(245,158,11,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,.3) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          {/* ambient glow */}
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-landly-gold/5 blur-[160px]" />
        </motion.div>

        {/* overlay nav */}
        <nav className="fixed top-0 left-0 z-50 flex w-full items-center justify-between px-6 py-5 md:px-12">
          <Link
            href="/"
            className="font-sans text-xl font-bold tracking-tight text-landly-offwhite"
          >
            Landly
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-[var(--radius-land)] px-5 py-2 text-sm font-medium text-landly-offwhite/80 transition-colors hover:text-landly-offwhite"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-[var(--radius-land)] bg-landly-green px-5 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Sign up
            </Link>
          </div>
        </nav>

        {/* hero content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 mx-auto max-w-3xl px-6 text-center"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.p
              variants={fadeUp(0)}
              className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-landly-gold"
            >
              Landly
            </motion.p>

            <motion.h1
              variants={fadeUp(0.1)}
              className="font-sans text-5xl font-bold leading-[1.1] tracking-tight text-landly-offwhite md:text-7xl"
            >
              Own a piece of India.
              <br />
              <span className="text-landly-gold">From ₹100.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp(0.2)}
              className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-landly-slate"
            >
              Fractional real estate investing for everyone. Buy shares in
              agricultural land, residential flats, and commercial spaces.
            </motion.p>

            <motion.div
              variants={fadeUp(0.3)}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link
                href="/signup"
                className="group relative inline-flex h-12 items-center justify-center rounded-[var(--radius-land)] bg-landly-green px-8 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                <span className="absolute inset-0 rounded-[var(--radius-land)] opacity-0 shadow-[0_0_24px_rgba(5,150,105,0.4)] transition-opacity group-hover:opacity-100" />
                <span className="relative">Start Investing</span>
              </Link>
              <Link
                href="/marketplace"
                className="group inline-flex h-12 items-center justify-center rounded-[var(--radius-land)] border border-landly-gold/40 px-8 text-sm font-semibold text-landly-gold transition-all hover:border-landly-gold hover:bg-landly-gold/5"
              >
                Explore Properties
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-10 w-5 rounded-full border border-landly-slate/40 p-1"
          >
            <div className="h-2 w-full rounded-full bg-landly-gold/60" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════ */}
      <section className="relative py-32 md:py-40">
        <div className="mx-auto max-w-5xl px-6">
          <Reveal className="text-center">
            <motion.p
              variants={fadeUp(0)}
              className="text-sm font-semibold uppercase tracking-[0.2em] text-landly-gold"
            >
              Simple process
            </motion.p>
            <motion.h2
              variants={fadeUp(0.1)}
              className="mt-3 font-sans text-3xl font-bold text-landly-offwhite md:text-4xl"
            >
              How It Works
            </motion.h2>
          </Reveal>

          <Reveal className="mt-20 grid gap-12 md:grid-cols-3 md:gap-0">
            {[
              {
                num: "01",
                title: "List Your Property",
                desc: "Property owners list their land, flat, or commercial space on the platform.",
              },
              {
                num: "02",
                title: "We Verify & Split",
                desc: "Landly verifies the property and divides it into affordable fractional shares.",
              },
              {
                num: "03",
                title: "Investors Buy Shares",
                desc: "Anyone can invest from ₹100.  When value rises, everyone benefits.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                variants={fadeUp(i * 0.12)}
                className="relative text-center md:px-8"
              >
                {/* connector line (desktop only) */}
                {i < 2 && (
                  <div className="pointer-events-none absolute right-0 top-6 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-landly-gold/30 to-transparent md:block" />
                )}
                <span className="font-mono text-4xl font-medium text-landly-gold">
                  {step.num}
                </span>
                <h3 className="mt-4 font-sans text-lg font-semibold text-landly-offwhite">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-landly-slate">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ PROPERTY TYPES ═════════════════ */}
      <section className="relative py-32 md:py-40">
        {/* subtle divider */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-landly-gold/20 to-transparent" />

        <div className="mx-auto max-w-5xl px-6">
          <Reveal className="text-center">
            <motion.p
              variants={fadeUp(0)}
              className="text-sm font-semibold uppercase tracking-[0.2em] text-landly-gold"
            >
              Diverse portfolio
            </motion.p>
            <motion.h2
              variants={fadeUp(0.1)}
              className="mt-3 font-sans text-3xl font-bold text-landly-offwhite md:text-4xl"
            >
              What You Can Invest In
            </motion.h2>
          </Reveal>

          <Reveal className="mt-20 grid gap-16 md:grid-cols-3">
            {[
              {
                icon: "🌾",
                type: "Agricultural",
                pitch: "Fertile farmland across Kerala, Punjab, and Maharashtra.",
                price: "₹1,000",
              },
              {
                icon: "🏠",
                type: "Residential",
                pitch: "Urban apartments and suburban homes in growing Indian cities.",
                price: "₹1,000",
              },
              {
                icon: "🏢",
                type: "Commercial",
                pitch: "Office parks, retail spaces, and tech campus units.",
                price: "₹10,000",
              },
            ].map((item, i) => (
              <motion.div
                key={item.type}
                variants={fadeUp(i * 0.12)}
                className="text-center"
              >
                <span className="text-4xl">{item.icon}</span>
                <h3 className="mt-4 font-sans text-lg font-semibold text-landly-offwhite">
                  {item.type}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-landly-slate">
                  {item.pitch}
                </p>
                <p className="mt-4 font-mono text-2xl font-medium text-landly-gold">
                  From {item.price}
                  <span className="text-sm text-landly-slate">/share</span>
                </p>
              </motion.div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ STATS + FINAL CTA ═════════════════ */}
      <section className="relative py-32 md:py-40">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-landly-gold/20 to-transparent" />

        <div className="mx-auto max-w-5xl px-6">
          {/* stats */}
          <Reveal className="flex flex-col items-center justify-center gap-12 md:flex-row md:gap-20">
            {[
              { value: "6", label: "Properties Listed" },
              { value: "1,200+", label: "Investors" },
              { value: "₹3.5 Cr+", label: "Platform Value" },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp(i * 0.1)} className="text-center">
                <span className="font-mono text-4xl font-bold text-landly-gold md:text-5xl">
                  {stat.value}
                </span>
                <p className="mt-2 text-sm text-landly-slate">{stat.label}</p>
              </motion.div>
            ))}
          </Reveal>

          {/* final CTA */}
          <Reveal className="mt-24 text-center">
            <motion.h2
              variants={fadeUp(0)}
              className="font-sans text-3xl font-bold text-landly-offwhite md:text-4xl"
            >
              Ready to own your piece?
            </motion.h2>
            <motion.div variants={fadeUp(0.15)} className="mt-8">
              <Link
                href="/signup"
                className="group relative inline-flex h-14 items-center justify-center rounded-[var(--radius-land)] bg-landly-green px-10 text-base font-semibold text-white transition-all hover:brightness-110"
              >
                <span className="absolute inset-0 rounded-[var(--radius-land)] opacity-0 shadow-[0_0_32px_rgba(5,150,105,0.35)] transition-opacity group-hover:opacity-100" />
                <span className="relative">Get Started — It&apos;s Free</span>
              </Link>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═════════════════════════ */}
      <footer className="border-t border-landly-slate/10 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <span className="font-sans text-sm font-semibold text-landly-offwhite/60">
            Landly
          </span>
          <div className="flex gap-6 text-xs text-landly-slate">
            <Link href="/marketplace" className="transition-colors hover:text-landly-offwhite">
              Marketplace
            </Link>
            <Link href="/login" className="transition-colors hover:text-landly-offwhite">
              Log in
            </Link>
            <Link href="/signup" className="transition-colors hover:text-landly-offwhite">
              Sign up
            </Link>
          </div>
          <span className="text-xs text-landly-slate/60">
            © 2026 Landly. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}

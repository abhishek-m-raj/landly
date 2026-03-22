"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NavbarProps {
  transparent?: boolean;
}

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar({ transparent = false }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const bg = transparent
    ? "bg-transparent"
    : "bg-landly-navy-deep/80 backdrop-blur-md border-b border-landly-slate/10";

  return (
    <>
      <nav className={`fixed top-0 left-0 z-50 flex w-full items-center justify-between px-6 py-4 md:px-12 ${bg} transition-colors`}>
        {/* brand */}
        <Link href="/" className="font-sans text-xl font-bold tracking-tight text-landly-offwhite">
          Landly
        </Link>

        {/* desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-landly-gold"
                  : "text-landly-offwhite/70 hover:text-landly-offwhite"
              }`}
            >
              {link.label}
              {pathname === link.href && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute -bottom-1 left-0 h-0.5 w-full bg-landly-gold"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
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

        {/* mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex flex-col gap-1.5 md:hidden"
          aria-label="Toggle menu"
        >
          <motion.span
            animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            className="block h-0.5 w-6 bg-landly-offwhite"
          />
          <motion.span
            animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
            className="block h-0.5 w-6 bg-landly-offwhite"
          />
          <motion.span
            animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            className="block h-0.5 w-6 bg-landly-offwhite"
          />
        </button>
      </nav>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-40 flex w-72 flex-col gap-6 bg-landly-navy-deep/95 backdrop-blur-xl p-8 pt-24 md:hidden"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-lg font-medium ${
                  pathname === link.href ? "text-landly-gold" : "text-landly-offwhite/80"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 border-t border-landly-slate/20 pt-4">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-lg font-medium text-landly-offwhite/80"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="mt-2 block rounded-[var(--radius-land)] bg-landly-green px-5 py-3 text-center text-sm font-semibold text-white"
              >
                Sign up
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}

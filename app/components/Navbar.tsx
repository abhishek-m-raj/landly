"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/components/AuthProvider";

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const { user, loading, signOut } = useAuth();

  // close avatar dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  const NAV_LINKS = [
    { href: "/marketplace", label: "Marketplace" },
    ...(user ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    { href: "/admin", label: "Admin" },
  ];

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
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-landly-slate/20 animate-pulse" />
          ) : user ? (
            <div ref={avatarRef} className="relative">
              <button
                onClick={() => setAvatarOpen(!avatarOpen)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-landly-gold/40 transition-all hover:border-landly-gold"
                aria-label="User menu"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-landly-offwhite">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </button>

              <AnimatePresence>
                {avatarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-(--radius-land) border border-landly-slate/15 bg-landly-navy-deep shadow-xl"
                  >
                    <div className="border-b border-landly-slate/10 px-4 py-3">
                      <p className="truncate text-sm font-medium text-landly-offwhite">
                        {user.user_metadata?.full_name || user.email}
                      </p>
                      <p className="truncate text-xs text-landly-slate">{user.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-landly-offwhite/80 transition-colors hover:bg-landly-slate/10 hover:text-landly-offwhite"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      Profile
                    </Link>
                    <button
                      onClick={async () => {
                        setAvatarOpen(false);
                        await signOut();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-landly-red/80 transition-colors hover:bg-landly-slate/10 hover:text-landly-red"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-(--radius-land) px-5 py-2 text-sm font-medium text-landly-offwhite/80 transition-colors hover:text-landly-offwhite"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-(--radius-land) bg-landly-green px-5 py-2 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                Sign up
              </Link>
            </>
          )}
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
              {user ? (
                <>
                  <div className="flex items-center gap-3 pb-3">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-9 w-9 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-landly-slate/20">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-landly-offwhite">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-landly-offwhite">
                        {user.user_metadata?.full_name || user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setMobileOpen(false);
                      await signOut();
                    }}
                    className="block w-full rounded-(--radius-land) border border-landly-red/30 py-2.5 text-center text-sm font-semibold text-landly-red transition-all hover:bg-landly-red/10"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
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
                    className="mt-2 block rounded-(--radius-land) bg-landly-green px-5 py-3 text-center text-sm font-semibold text-white"
                  >
                    Sign up
                  </Link>
                </>
              )}
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

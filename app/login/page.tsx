"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Navbar from "@/app/components/Navbar";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/marketplace");
  }

  return (
    <div className="flex min-h-svh flex-col bg-landly-navy">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="w-full max-w-sm"
        >
          <h1 className="font-sans text-3xl font-bold text-landly-offwhite">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-landly-slate">
            Log in to your Landly account
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[var(--radius-land)] border border-landly-slate/20 bg-landly-navy-deep px-4 py-3 text-sm text-landly-offwhite placeholder:text-landly-slate/50 outline-none transition-all focus:border-landly-gold/50 focus:ring-1 focus:ring-landly-gold/30"
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[var(--radius-land)] border border-landly-slate/20 bg-landly-navy-deep px-4 py-3 text-sm text-landly-offwhite placeholder:text-landly-slate/50 outline-none transition-all focus:border-landly-gold/50 focus:ring-1 focus:ring-landly-gold/30"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-landly-red"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-[var(--radius-land)] bg-landly-green py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Logging in…" : "Log In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-landly-slate">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-landly-gold transition-colors hover:text-landly-gold/80">
              Sign up
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Navbar from "@/app/components/Navbar";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: "investor" } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    window.localStorage.setItem("landly-user-role", "investor");
    router.push("/marketplace");
  }

  async function handleGoogleSignup() {
    setError("");
    window.localStorage.setItem("landly-user-role", "investor");

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent("/marketplace")}`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-landly-navy">
      <Navbar />

      <main className="flex flex-1 items-center justify-center px-6 pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="w-full max-w-sm"
        >
          <h1 className="font-sans text-3xl font-bold text-landly-offwhite">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-landly-slate">
            Join Landly to unlock property value or start investing with confidence
          </p>

          <form onSubmit={handleSignup} className="mt-8 space-y-5">
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-[var(--radius-land)] border border-landly-slate/20 bg-landly-navy-deep px-4 py-3 text-sm text-landly-offwhite placeholder:text-landly-slate/50 outline-none transition-all focus:border-landly-gold/50 focus:ring-1 focus:ring-landly-gold/30"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[var(--radius-land)] border border-landly-slate/20 bg-landly-navy-deep px-4 py-3 text-sm text-landly-offwhite placeholder:text-landly-slate/50 outline-none transition-all focus:border-landly-gold/50 focus:ring-1 focus:ring-landly-gold/30"
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[var(--radius-land)] border border-landly-slate/20 bg-landly-navy-deep px-4 py-3 text-sm text-landly-offwhite placeholder:text-landly-slate/50 outline-none transition-all focus:border-landly-gold/50 focus:ring-1 focus:ring-landly-gold/30"
                placeholder="Min 6 characters"
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
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-landly-slate/20" />
            <span className="text-xs text-landly-slate">or</span>
            <div className="h-px flex-1 bg-landly-slate/20" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            className="flex w-full items-center justify-center gap-3 rounded-[var(--radius-land)] border border-landly-slate/20 bg-landly-navy-deep py-3 text-sm font-medium text-landly-offwhite transition-all hover:border-landly-slate/40 hover:bg-landly-navy-deep/80"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-landly-slate">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-landly-gold transition-colors hover:text-landly-gold/80">
              Log in
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

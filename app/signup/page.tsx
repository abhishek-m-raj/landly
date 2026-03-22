"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Navbar from "@/app/components/Navbar";

type Role = "investor" | "owner";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("investor");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    /* 1. Create auth user */
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    /* 2. Insert into profiles */
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        wallet_balance: 10000,
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/marketplace");
  }

  const roleOptions: { value: Role; label: string; desc: string }[] = [
    {
      value: "investor",
      label: "I want to invest",
      desc: "Browse properties and buy fractional shares",
    },
    {
      value: "owner",
      label: "I want to list property",
      desc: "List your land or property for investment",
    },
  ];

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
            Join Landly and start investing from ₹100
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

            {/* role selector */}
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-landly-slate">
                I am a…
              </label>
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`rounded-[var(--radius-land)] border px-4 py-3 text-left transition-all ${
                      role === opt.value
                        ? "border-landly-gold bg-landly-gold/5 text-landly-offwhite"
                        : "border-landly-slate/20 text-landly-slate hover:border-landly-slate/40"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{opt.label}</span>
                    <span className="mt-0.5 block text-xs opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
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

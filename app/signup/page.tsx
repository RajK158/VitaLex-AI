"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function SignupPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function ensureUserProfile(user: { id: string; email: string | null }) {
    const { data: existingProfile } = await supabase
      .from("vitalex_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()

    if (existingProfile) return

    await supabase.from("vitalex_profiles").insert({
      id: user.id,
      email: user.email,
      role: "admin",
    })
  }

  async function handleSignup() {
    if (!email || !password) {
      setMessage("Please enter your email and password.")
      return
    }

    try {
      setLoading(true)
      setMessage("")

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
        return
      }

      if (data.session && data.user) {
        await ensureUserProfile({
          id: data.user.id,
          email: data.user.email ?? email,
        })
        router.push("/dashboard")
        return
      }

      setMessage(
        "Account created. Please check your email to confirm your account before logging in."
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignup() {
    try {
      setGoogleLoading(true)
      setMessage("")

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setMessage(error.message)
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-10 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
        <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">
          VitaLex
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Get started with healthcare policy summaries and rule generation.
        </p>

        <div className="mt-6 grid gap-4">
          <div>
            <label className="mb-2 block text-sm text-zinc-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-sm text-zinc-300"
            />
          </div>
        </div>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="mt-4 w-full rounded-full border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-zinc-300">{message}</p>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-white underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}

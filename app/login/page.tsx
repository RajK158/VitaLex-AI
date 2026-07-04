"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function handleLogin() {
    if (!email || !password) {
      setMessage("Please enter your email and password.")
      return
    }

    try {
      setLoading(true)
      setMessage("")

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
        return
      }

      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
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
          Log in to your account
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Access your healthcare policy documents, summaries, and rules.
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
          onClick={handleLogin}
          disabled={loading}
          className="mt-6 w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="mt-4 w-full rounded-full border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        {message && (
          <p className="mt-4 text-sm text-zinc-300">{message}</p>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-white underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}

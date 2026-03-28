"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api, ApiError } from "@/lib/api";
import type { LoginResponse } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      localStorage.setItem("token", res.accessToken);
      localStorage.setItem("user", JSON.stringify(res.user));
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-1">
            <Shield className="size-7 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-primary">
              Complif HQ
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Institutional Grade Compliance Ledger
          </p>
        </div>

        <div className="rounded-xl bg-card p-8">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Welcome Back
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Please enter your credentials to access your secure ledger.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-widest uppercase text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold tracking-widest uppercase text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <label
                htmlFor="remember"
                className="text-sm text-muted-foreground"
              >
                Remember this device for 30 days
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted px-5 py-2">
            <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
              Enterprise SSO available for verified domains
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>Support</span>
            <span>Terms</span>
            <span>Privacy</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>SOC2 Type II</span>
            <span>AES-256 Encrypted</span>
            <span>ISO 27001</span>
          </div>
        </div>
      </div>
    </div>
  );
}

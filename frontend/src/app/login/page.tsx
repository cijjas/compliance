"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@complif.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1
            className="text-2xl font-bold text-primary"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Complif HQ
          </h1>
          <p className="text-label-caps text-on-surface-variant mt-1">
            Compliance Ledger
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-surface-container-low border-none"
              required
            />
          </div>
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-2">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-surface-container-low border-none"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-status-rejected-fg bg-status-rejected px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary-gradient text-primary-foreground text-label-caps shadow-ambient"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          Use admin@complif.com / admin123
        </p>
      </div>
    </div>
  );
}

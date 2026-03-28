"use client";

export default function CompanyDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-destructive">Something went wrong</h2>
      <pre className="mt-2 max-w-xl overflow-auto rounded-lg bg-muted p-4 text-xs">
        {error.message}
      </pre>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}

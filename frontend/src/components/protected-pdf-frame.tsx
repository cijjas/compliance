"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const INLINE_PDF_VIEWER_HASH =
  "#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH";

type ProtectedPdfFrameProps = {
  path: string;
  title: string;
  className?: string;
  viewerHash?: string;
  fallbackLabel?: string;
};

export function ProtectedPdfFrame({
  path,
  title,
  className,
  viewerHash = "",
  fallbackLabel = "Preview unavailable.",
}: ProtectedPdfFrameProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    async function loadDocument() {
      try {
        const blob = await api.download(path, { signal: controller.signal });
        objectUrl = URL.createObjectURL(blob);
        setSrc(viewerHash ? `${objectUrl}${viewerHash}` : objectUrl);
      } catch {
        if (!controller.signal.aborted) {
          setHasError(true);
        }
      }
    }

    void loadDocument();

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path, viewerHash]);

  if (src) {
    return <iframe src={src} className={className} title={title} />;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-muted px-4 text-center text-xs text-muted-foreground",
        className,
      )}
    >
      {hasError ? fallbackLabel : "Loading document..."}
    </div>
  );
}

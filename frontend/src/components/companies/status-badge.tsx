"use client";

import type { BusinessStatus } from "@/types";

const statusConfig: Record<
  BusinessStatus,
  { label: string; className: string }
> = {
  approved: {
    label: "APPROVED",
    className: "bg-status-approved text-status-approved-fg",
  },
  in_review: {
    label: "IN REVIEW",
    className: "bg-status-review text-status-review-fg",
  },
  pending: {
    label: "PENDING",
    className: "bg-status-pending text-status-pending-fg",
  },
  rejected: {
    label: "REJECTED",
    className: "bg-status-rejected text-status-rejected-fg",
  },
};

export function StatusBadge({ status }: { status: BusinessStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-caps ${config.className}`}
      style={{ fontSize: "0.6rem", letterSpacing: "0.06em" }}
    >
      {config.label}
    </span>
  );
}

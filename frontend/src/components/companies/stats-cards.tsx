"use client";

import type { Business } from "@/types";

interface StatsCardsProps {
  businesses: Business[];
  total: number;
}

export function StatsCards({ businesses, total }: StatsCardsProps) {
  const inReview = businesses.filter((b) => b.status === "in_review").length;
  const approved = businesses.filter((b) => b.status === "approved").length;
  const complianceRate = total > 0 ? ((approved / total) * 100).toFixed(1) : "0.0";

  const cards = [
    {
      label: "TOTAL ACTIVE",
      value: total.toLocaleString(),
      sub: null,
      accent: false,
    },
    {
      label: "IN REVIEW",
      value: inReview.toString(),
      sub: "High Priority",
      accent: false,
    },
    {
      label: "AVG. APPROVAL TIME",
      value: "3.2",
      sub: "Days",
      accent: true,
    },
    {
      label: "COMPLIANCE RATE",
      value: `${complianceRate}%`,
      sub: null,
      accent: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`px-8 py-6 ${
            i === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low"
          }`}
        >
          <p
            className={`text-label-caps mb-2 ${
              card.accent ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            {card.label}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-semibold text-on-surface text-data"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              {card.value}
            </span>
            {card.sub && (
              <span className="text-sm text-on-surface-variant">{card.sub}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

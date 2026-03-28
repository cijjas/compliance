"use client";

import { Search, Globe, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COUNTRY_MAP } from "@/lib/constants";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  country: string;
  onCountryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function FilterBar({
  search,
  onSearchChange,
  country,
  onCountryChange,
  status,
  onStatusChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
        <Input
          placeholder="Search by company name or legal ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-11 h-11 bg-surface-container-low border-none text-sm focus:bg-surface-container-lowest"
        />
      </div>

      {/* Country filter */}
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant pointer-events-none" />
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          className="h-11 pl-10 pr-8 rounded-lg bg-surface-container-low text-sm text-on-surface border-none appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Countries</option>
          {Object.entries(COUNTRY_MAP).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Status filter */}
      <div className="relative">
        <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant pointer-events-none" />
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-11 pl-10 pr-8 rounded-lg bg-surface-container-low text-sm text-on-surface border-none appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* More filters */}
      <Button
        variant="ghost"
        className="text-primary font-semibold text-label-caps h-11 gap-2"
      >
        <SlidersHorizontal className="size-4" />
        More Filters
      </Button>
    </div>
  );
}

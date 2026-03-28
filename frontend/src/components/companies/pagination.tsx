"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationProps) {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <p className="text-sm text-on-surface-variant">
        Showing <span className="text-data">{from}</span>–
        <span className="text-data">{to}</span> of{" "}
        <span className="text-data font-medium text-on-surface">{total}</span>{" "}
        companies
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="text-on-surface-variant disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="text-on-surface-variant disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

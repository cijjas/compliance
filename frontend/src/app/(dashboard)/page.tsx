"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import { BusinessStatus } from "@/lib/types";
import type { Business, BusinessStats, PaginatedResponse } from "@/lib/types";
import {
  COUNTRY_LABELS,
  COUNTRY_OPTIONS,
  STATUS_LABELS,
} from "@/lib/constants";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const [data, setData] = useState<PaginatedResponse<Business> | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [page, setPage] = useState(1);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    if (country !== "all") params.set("country", country);

    try {
      const [res, statsRes] = await Promise.all([
        api.get<PaginatedResponse<Business>>(`/businesses?${params}`),
        api.get<BusinessStats>("/businesses/stats"),
      ]);
      setData(res);
      setStats(statsRes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load companies",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, country]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Reset to page 1 when filters change — page is a dependency of fetchBusinesses
  // so the effect above will re-run automatically
  useEffect(() => {
    setPage(1);
  }, [search, status, country]);

  const businesses = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-primary">
            Compliance Registry
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
            Companies
          </h1>
        </div>
        <Link href="/register">
          <Button size="lg">
            <Building2 className="size-4" />
            Register New Company
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company name or legal ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {COUNTRY_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.values(BusinessStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Company Name</TableHead>
              <TableHead>CUIT/Tax ID</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16 text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && businesses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : businesses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  No companies found.
                </TableCell>
              </TableRow>
            ) : (
              businesses.map((biz) => (
                <TableRow key={biz.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {getInitials(biz.name)}
                      </div>
                      <Link
                        href={`/companies/${biz.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {biz.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {biz.taxIdentifier}
                  </TableCell>
                  <TableCell>
                    {COUNTRY_LABELS[biz.country] ?? biz.country}
                  </TableCell>
                  <TableCell className="capitalize">
                    {biz.industry.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={biz.status} />
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/companies/${biz.id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Showing {businesses.length} of {total} companies
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard label="Total Companies" value={stats?.total ?? "—"} />
        <StatsCard
          label="In Review"
          value={stats?.byStatus?.in_review ?? "—"}
          detail="High Priority"
        />
        <StatsCard
          label="Avg. Approval Time"
          value={stats?.avgApprovalDays != null ? String(stats.avgApprovalDays) : "—"}
          detail="Days"
        />
        <StatsCard
          label="Compliance Rate"
          value={
            stats?.complianceRate != null
              ? `${(stats.complianceRate * 100).toFixed(1)}%`
              : "—"
          }
        />
      </div>
    </div>
  );
}

function StatsCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <CardTitle>{label}</CardTitle>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold tracking-tight text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {detail && (
            <span className="text-sm text-muted-foreground">{detail}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

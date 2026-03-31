"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { CompanyAvatar } from "@/components/company-avatar";
import { CountryLabel } from "@/components/country-flag";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import {
  buildCountryLabelMap,
  buildIndustryLabelMap,
  useBusinessReferenceData,
} from "@/lib/reference-data";
import { BusinessStatus } from "@/lib/types";
import type { Business, BusinessStats, PaginatedResponse } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";

const PAGE_SIZE = 10;

function formatIndustry(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function CompaniesPage() {
  const [data, setData] = useState<PaginatedResponse<Business> | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [industry, setIndustry] = useState<string>("all");
  const [page, setPage] = useState(1);
  const { referenceData, error: referenceDataError } = useBusinessReferenceData();

  const activeRequestId = useRef<number>(0);
  const countryLabels = buildCountryLabelMap(referenceData);
  const industryLabels = buildIndustryLabelMap(referenceData);

  const fetchBusinesses = useCallback(async () => {
    const requestId = ++activeRequestId.current;
    
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    if (country !== "all") params.set("country", country);
    if (industry !== "all") params.set("industry", industry);

    try {
      const [res, statsRes] = await Promise.all([
        api.get<PaginatedResponse<Business>>(`/businesses?${params}`),
        api.get<BusinessStats>("/businesses/stats"),
      ]);
      if (requestId !== activeRequestId.current) return;
      setData(res);
      setStats(statsRes);
    } catch (err) {
      if (requestId !== activeRequestId.current) return;
      setError(
        err instanceof Error ? err.message : "Failed to load companies",
      );
    } finally {
      if (requestId === activeRequestId.current) {
        setLoading(false);
      }
    }
  }, [page, search, status, country, industry]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const businesses = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const firstVisibleItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVisibleItem =
    total === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + businesses.length, total);
  const paginationItems = buildPaginationItems(page, totalPages);

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

      {/* Error */}
      {(error ?? referenceDataError) && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error ?? referenceDataError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Total Companies" value={stats?.total ?? "—"} />
        <StatsCard
          label="In Review"
          value={stats?.byStatus?.in_review ?? "—"}
          detail="High Priority"
        />
        <StatsCard
          label="Avg. Approval Time"
          value={
            stats?.avgApprovalDays != null ? String(stats.avgApprovalDays) : "—"
          }
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

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-md lg:flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company name or legal ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={country} onValueChange={(val) => { setCountry(val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              {country === "all" ? (
                <SelectValue placeholder="All Countries" />
              ) : (
                <SelectValue>
                  <CountryLabel code={country} label={countryLabels[country] ?? country} />
                </SelectValue>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {(referenceData?.countries ?? []).map((countryOption) => (
                <SelectItem key={countryOption.code} value={countryOption.code}>
                  <CountryLabel
                    code={countryOption.code}
                    label={countryOption.name}
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40">
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

          <Select value={industry} onValueChange={(val) => { setIndustry(val); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {(referenceData?.industries ?? []).map((industryOption) => (
                <SelectItem key={industryOption.key} value={industryOption.key}>
                  {industryOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Company Name</TableHead>
              <TableHead>Tax ID</TableHead>
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
                      <CompanyAvatar name={biz.name} className="size-9" />
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
                    <CountryLabel
                      code={biz.country}
                      label={countryLabels[biz.country] ?? biz.country}
                    />
                  </TableCell>
                  <TableCell>
                    {industryLabels[biz.industry] ?? formatIndustry(biz.industry)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={biz.status} />
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/companies/${biz.id}`}>View Details</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex flex-col gap-4 bg-muted/25 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-muted-foreground">
            {total === 0
              ? "No companies to display"
              : `Showing ${firstVisibleItem}-${lastVisibleItem} of ${total} companies`}
          </p>
          {totalPages > 1 && (
            <Pagination className="mx-0 w-full justify-start lg:w-auto lg:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    disabled={loading || page <= 1}
                    onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                  />
                </PaginationItem>

                {paginationItems.map((item) => (
                  <PaginationItem key={item}>
                    {typeof item === "number" ? (
                      <PaginationLink
                        isActive={item === page}
                        aria-label={`Go to page ${item}`}
                        disabled={loading}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </PaginationLink>
                    ) : (
                      <PaginationEllipsis />
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    disabled={loading || page >= totalPages}
                    onClick={() =>
                      setPage((currentPage) => Math.min(currentPage + 1, totalPages))
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
}

function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): Array<number | string> {
  if (totalPages <= 1) {
    return totalPages === 1 ? [1] : [];
  }

  const pages = new Set(
    [1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
      (candidate) => candidate >= 1 && candidate <= totalPages,
    ),
  );
  const orderedPages = [...pages].sort((left, right) => left - right);

  return orderedPages.flatMap((candidate, index) => {
    if (index === 0) {
      return [candidate];
    }

    const previousPage = orderedPages[index - 1];

    if (candidate - previousPage === 1) {
      return [candidate];
    }

    if (candidate - previousPage === 2) {
      return [previousPage + 1, candidate];
    }

    return [`ellipsis-${previousPage}-${candidate}`, candidate];
  });
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

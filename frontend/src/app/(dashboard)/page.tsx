"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompaniesTable } from "@/components/companies/companies-table";
import { FilterBar } from "@/components/companies/filter-bar";
import { Pagination } from "@/components/companies/pagination";
import { StatsCards } from "@/components/companies/stats-cards";
import { api } from "@/lib/api";
import type { Business } from "@/types";

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBusinesses({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        country: country || undefined,
        status: status || undefined,
      });
      setBusinesses(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      // If unauthorized, redirect to login
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [page, search, country, status, router]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Debounce search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCountryChange = (value: string) => {
    setCountry(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-8 pt-10 pb-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-label-caps text-primary mb-2">
              Compliance Registry
            </p>
            <h1
              className="text-display-lg text-on-surface"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              Companies
            </h1>
          </div>
          <Button
            className="bg-primary-gradient text-primary-foreground h-12 px-6 gap-2 text-label-caps rounded-lg shadow-ambient hover:opacity-90 transition-opacity"
          >
            <Building2 className="size-4" />
            Register New Company
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 pb-6">
        <FilterBar
          search={searchInput}
          onSearchChange={setSearchInput}
          country={country}
          onCountryChange={handleCountryChange}
          status={status}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Table */}
      <div className="px-8 flex-1">
        {loading ? (
          <div className="bg-surface-container-lowest rounded-xl p-12 shadow-ambient flex items-center justify-center">
            <p className="text-on-surface-variant text-sm">Loading companies...</p>
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-12 shadow-ambient flex flex-col items-center justify-center gap-3">
            <Building2 className="size-10 text-on-surface-variant/40" />
            <p className="text-on-surface-variant text-sm">No companies found</p>
          </div>
        ) : (
          <>
            <CompaniesTable
              businesses={businesses}
              onViewDetail={(id) => router.push(`/companies/${id}`)}
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Stats */}
      <div className="mt-auto pt-8">
        <StatsCards businesses={businesses} total={total} />
      </div>
    </div>
  );
}

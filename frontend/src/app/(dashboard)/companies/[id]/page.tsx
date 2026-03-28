"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Eye,
  Info,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { api, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BusinessStatus, DocumentType, UserRole } from "@/lib/types";
import type { Business, BusinessRiskAssessment } from "@/lib/types";
import { COUNTRY_LABELS, STATUS_LABELS } from "@/lib/constants";

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.FISCAL_CERTIFICATE]: "Tax Certificate",
  [DocumentType.REGISTRATION_PROOF]: "Proof of Registration",
  [DocumentType.INSURANCE_POLICY]: "Insurance Policy",
};

function getRiskTone(score: number) {
  if (score >= 60) {
    return {
      label: "High Exposure",
      barClass: "bg-rose-400",
      badgeClass: "bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-400/30",
    };
  }

  if (score >= 25) {
    return {
      label: "Guarded Profile",
      barClass: "bg-amber-300",
      badgeClass: "bg-amber-400/15 text-amber-100 ring-1 ring-inset ring-amber-300/30",
    };
  }

  return {
    label: "Low Exposure",
    barClass: "bg-emerald-300",
    badgeClass: "bg-emerald-400/15 text-emerald-100 ring-1 ring-inset ring-emerald-300/30",
  };
}

function formatDocumentTypeLabel(type: DocumentType) {
  return DOC_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [business, setBusiness] = useState<Business | null>(null);
  const [riskAssessment, setRiskAssessment] =
    useState<BusinessRiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DocumentType | null>(null);

  const fetchBusiness = useCallback(async () => {
    setError(null);
    try {
      const [businessRes, riskRes] = await Promise.all([
        api.get<Business>(`/businesses/${id}`),
        api.get<BusinessRiskAssessment>(`/businesses/${id}/risk-score`),
      ]);
      setBusiness(businessRes);
      setRiskAssessment(riskRes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load company",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  async function handleStatusChange(newStatus: string) {
    if (!business || newStatus === business.status) return;
    setStatusUpdating(true);
    try {
      await api.patch(`/businesses/${id}/status`, { status: newStatus });
      await fetchBusiness();
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleUpload(docType: DocumentType, file: File) {
    setUploading(docType);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", docType);
      await api.upload(`/businesses/${id}/documents`, formData);
      await fetchBusiness();
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading company...</p>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!business) {
    return <p className="text-sm text-destructive">Company not found.</p>;
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const score = riskAssessment?.score ?? business.riskScore ?? 0;
  const riskTone = getRiskTone(score);
  const riskBreakdown = riskAssessment?.breakdown;
  const missingDocuments = riskBreakdown?.missingDocumentTypes ?? [];
  const riskDrivers = [
    {
      label: "Jurisdiction signal",
      points: riskBreakdown?.countryRisk ?? 0,
      description:
        (riskBreakdown?.countryRisk ?? 0) > 0
          ? `${COUNTRY_LABELS[business.country] ?? business.country} is treated as a higher-risk jurisdiction in the current model.`
          : `${COUNTRY_LABELS[business.country] ?? business.country} adds no extra jurisdiction risk.`,
    },
    {
      label: "Industry signal",
      points: riskBreakdown?.industryRisk ?? 0,
      description:
        (riskBreakdown?.industryRisk ?? 0) > 0
          ? `${business.industry.replace(/_/g, " ")} is categorized as a higher-risk operating sector.`
          : `${business.industry.replace(/_/g, " ")} does not add sector-specific risk.`,
    },
    {
      label: "Documentation signal",
      points: riskBreakdown?.documentationRisk ?? 0,
      description:
        (riskBreakdown?.documentationRisk ?? 0) > 0
          ? `Missing ${missingDocuments.map(formatDocumentTypeLabel).join(", ").toLowerCase()}.`
          : "All required compliance documents are currently on file.",
    },
  ];
  const buildDocumentUrl = (docId: string, embedded = false) => {
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    const hash = embedded
      ? "#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
      : "";

    return `${API_BASE}/businesses/${id}/documents/${docId}/download${query}${hash}`;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Companies
          </Link>
          <span>/</span>
          <span className="text-primary">{business.name}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Go Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            {business.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registration ID:{" "}
            <span className="font-mono text-primary">
              {business.id.slice(0, 8).toUpperCase()}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={business.status} />
          {isAdmin && (
            <Select
              value={business.status}
              onValueChange={handleStatusChange}
              disabled={statusUpdating}
            >
              <SelectTrigger className="w-44">
                <SelectValue>
                  {statusUpdating ? "Updating..." : "Update Status"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(BusinessStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column — details + documents */}
        <div className="col-span-2 space-y-6">
          {/* Entity Details */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold tracking-tight mb-6">
                Entity Details
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <Detail label="Legal Name" value={business.name} />
                <Detail
                  label="Jurisdiction"
                  value={
                    COUNTRY_LABELS[business.country] ?? business.country
                  }
                />
                <Detail label="CUIT / Tax ID" value={business.taxIdentifier} />
                <Detail
                  label="Industry"
                  value={business.industry.replace(/_/g, " ")}
                />
                <Detail
                  label="Identifier Validated"
                  value={business.identifierValidated ? "Yes" : "No"}
                />
                <Detail
                  label="Risk Score"
                  value={
                    riskAssessment || business.riskScore !== null
                      ? `${score} / 100`
                      : "Pending"
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardContent className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold tracking-tight">
                  Compliance Documents
                </h2>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  PDF only
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.values(DocumentType).map((docType) => {
                  const doc = business.documents.find(
                    (document) => document.type === docType,
                  );
                  const isUploaded = !!doc;
                  const isUploading = uploading === docType;
                  const isDragActive = dragTarget === docType;

                  if (isUploaded) {
                    return (
                      <div
                        key={docType}
                        className="relative flex h-[360px] flex-col rounded-xl border bg-card p-3"
                      >
                        <div className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <CheckCircle2 className="size-4" />
                        </div>

                        <div className="min-h-0 overflow-hidden rounded-lg border bg-muted">
                          <iframe
                            src={buildDocumentUrl(doc.id, true)}
                            className="h-52 w-full pointer-events-none"
                            title={`${doc.fileName} first page`}
                          />
                        </div>

                        <div className="mt-4 min-h-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {doc.fileName}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {formatDocumentTypeLabel(doc.type)}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Uploaded {formatDate(doc.createdAt)}
                          </p>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="flex-1">
                                <Info className="size-3.5" />
                                Info
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-72 space-y-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  Document Info
                                </p>
                                <p className="mt-2 text-sm font-semibold text-foreground">
                                  {doc.fileName}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <InfoItem label="Type" value={formatDocumentTypeLabel(doc.type)} />
                                <InfoItem label="Size" value={formatBytes(doc.fileSize)} />
                                <InfoItem label="Uploaded" value={formatDate(doc.createdAt)} />
                                <InfoItem label="Format" value={doc.mimeType} />
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => setPreviewDocId(doc.id)}
                          >
                            <Eye className="size-3.5" />
                            Full Preview
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={docType}
                      className={`flex h-[360px] flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-6 text-center transition-colors ${
                        isDragActive
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      onDragOver={(event) => {
                        if (!isAdmin) return;
                        event.preventDefault();
                        setDragTarget(docType);
                      }}
                      onDragLeave={() => {
                        if (dragTarget === docType) {
                          setDragTarget(null);
                        }
                      }}
                      onDrop={(event) => {
                        if (!isAdmin) return;
                        event.preventDefault();
                        setDragTarget(null);
                        const file = event.dataTransfer.files?.[0];
                        if (file) {
                          void handleUpload(docType, file);
                        }
                      }}
                    >
                      <Plus className="size-12 text-muted-foreground/40" />
                      <p className="mt-5 text-sm font-semibold text-foreground">
                        {formatDocumentTypeLabel(docType)}
                      </p>
                      <p className="mt-2 max-w-[15rem] text-sm text-muted-foreground">
                        {isAdmin
                          ? "Upload the missing PDF for this requirement."
                          : "This document has not been uploaded yet."}
                      </p>

                      {isAdmin ? (
                        <label className="mt-6 cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void handleUpload(docType, file);
                              }
                            }}
                          />
                          <Button variant="outline" size="sm" asChild disabled={isUploading}>
                            <span>
                              <Upload className="size-3.5" />
                              {isUploading ? "Uploading..." : "Upload"}
                            </span>
                          </Button>
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-none">
            <CardContent className="rounded-[28px] bg-slate-950 p-8 text-slate-50">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <p className="text-xs font-semibold tracking-[0.24em] uppercase text-slate-400">
                    Risk Review
                  </p>
                  <div className="flex items-end gap-3">
                    <span className="font-display text-5xl font-bold tracking-tight">
                      {score}
                    </span>
                    <span className="pb-2 text-sm text-slate-400">/ 100</span>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300">
                    Based on jurisdiction, industry profile, and document
                    coverage. This score refreshes automatically when company
                    documents change.
                  </p>
                </div>

                <div
                  className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold tracking-[0.18em] uppercase ${riskTone.badgeClass}`}
                >
                  {riskTone.label}
                </div>
              </div>

              <div className="mt-6">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all ${riskTone.barClass}`}
                    style={{ width: `${Math.max(score, 6)}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {riskDrivers.map((driver) => (
                  <div
                    key={driver.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {driver.label}
                      </p>
                      <span className="text-xs font-semibold tracking-[0.18em] uppercase text-slate-400">
                        +{driver.points}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {driver.description}
                    </p>
                  </div>
                ))}
              </div>

              {missingDocuments.length > 0 && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">
                    Missing Documents
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingDocuments.map((type) => (
                      <span
                        key={type}
                        className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-200"
                      >
                        {formatDocumentTypeLabel(type)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — timeline */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-bold tracking-tight mb-6">
                Verification Journey
              </h2>
              <div className="space-y-6">
                {business.statusHistory.map((entry, i) => {
                  const isLast = i === business.statusHistory.length - 1;
                  return (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {isLast ? (
                          <Circle className="size-5 text-primary" />
                        ) : (
                          <CheckCircle2 className="size-5 text-primary" />
                        )}
                        {!isLast && (
                          <div className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            Status: {STATUS_LABELS[entry.newStatus]}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(entry.createdAt)}
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {entry.reason}
                          </p>
                        )}
                        {entry.changedBy && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            By {entry.changedBy.firstName}{" "}
                            {entry.changedBy.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
                Activity Log
              </h3>
              <div className="space-y-3">
                {business.statusHistory
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        Status changed to{" "}
                        <span className="font-medium">
                          {STATUS_LABELS[entry.newStatus]}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(entry.createdAt)}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Preview */}
      {previewDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-4xl h-[80vh] rounded-xl bg-card p-2">
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-4 z-10"
              onClick={() => setPreviewDocId(null)}
            >
              <X className="size-4" />
            </Button>
            <iframe
              src={buildDocumentUrl(previewDocId)}
              className="size-full rounded-lg"
              title="Document preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1">
        {label}
      </p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

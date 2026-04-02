"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, Info, Plus, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CountryLabel } from "@/components/country-flag";
import { INLINE_PDF_VIEWER_HASH, ProtectedPdfFrame } from "@/components/protected-pdf-frame";
import { RiskAnalysis } from "@/components/risk-analysis";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canManageComplianceRecords } from "@/lib/permissions";
import { buildCountryLabelMap, buildIndustryLabelMap, useBusinessReferenceData } from "@/lib/reference-data";
import { BusinessStatus, DocumentType } from "@/lib/types";
import type { Business, BusinessRiskAssessment } from "@/lib/types";
import { MAX_FILE_SIZE, STATUS_LABELS } from "@/lib/constants";
import { formatIndustry, formatBytes, formatDate, formatDateTime, timeAgo } from "@/lib/formatting";

type ActivityLogEntry =
  | {
      id: string;
      kind: "status";
      createdAt: string;
      title: string;
      subtitle: string | null;
      actor: string | null;
      actorInitials: string | null;
    }
  | {
      id: string;
      kind: "document";
      createdAt: string;
      title: string;
      subtitle: string;
      actor: null;
      actorInitials: null;
    };

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.FISCAL_CERTIFICATE]: "Tax Certificate",
  [DocumentType.REGISTRATION_PROOF]: "Proof of Registration",
  [DocumentType.INSURANCE_POLICY]: "Insurance Policy",
};

const STATUS_SELECT_PLACEHOLDER = "__prompt__";

type StatusTransitionAction = {
  status: BusinessStatus;
  label: string;
  description: string;
};

function getStatusActionCopy(
  currentStatus: BusinessStatus,
  nextStatus: BusinessStatus,
): Omit<StatusTransitionAction, "status"> {
  if (currentStatus === BusinessStatus.PENDING && nextStatus === BusinessStatus.IN_REVIEW) {
    return {
      label: "Move to In Review",
      description: "Open the case for analyst review.",
    };
  }

  if (currentStatus === BusinessStatus.PENDING && nextStatus === BusinessStatus.REJECTED) {
    return {
      label: "Reject Case",
      description: "Close the case as rejected with an audit note.",
    };
  }

  if (currentStatus === BusinessStatus.IN_REVIEW && nextStatus === BusinessStatus.APPROVED) {
    return {
      label: "Approve Case",
      description: "Mark the company as approved and complete onboarding.",
    };
  }

  if (currentStatus === BusinessStatus.IN_REVIEW && nextStatus === BusinessStatus.REJECTED) {
    return {
      label: "Reject Case",
      description: "Reject the case after documenting the review outcome.",
    };
  }

  if (currentStatus === BusinessStatus.APPROVED && nextStatus === BusinessStatus.IN_REVIEW) {
    return {
      label: "Send Back to Review",
      description: "Reopen an approved case for another review cycle.",
    };
  }

  if (currentStatus === BusinessStatus.REJECTED && nextStatus === BusinessStatus.IN_REVIEW) {
    return {
      label: "Reopen for Review",
      description: "Reopen a rejected case by moving it back into review.",
    };
  }

  return {
    label: `Move to ${STATUS_LABELS[nextStatus]}`,
    description: `Record the transition from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[nextStatus]}.`,
  };
}

function formatDocumentTypeLabel(type: DocumentType) {
  return DOC_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function getActorName(actor: { firstName: string; lastName: string } | null) {
  if (!actor) return null;
  return `${actor.firstName} ${actor.lastName}`.trim();
}

function getActorInitials(actor: { firstName: string; lastName: string } | null) {
  if (!actor) return null;
  return `${actor.firstName[0]}${actor.lastName[0]}`.toUpperCase();
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { referenceData } = useBusinessReferenceData();
  const canManageBusinesses = canManageComplianceRecords(user);

  const [business, setBusiness] = useState<Business | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<BusinessRiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DocumentType | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusSelection, setStatusSelection] = useState(STATUS_SELECT_PLACEHOLDER);
  const [nextStatus, setNextStatus] = useState<BusinessStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const countryLabels = buildCountryLabelMap(referenceData);
  const industryLabels = buildIndustryLabelMap(referenceData);

  const fetchBusiness = useCallback(async () => {
    setError(null);
    try {
      const [businessRes, riskRes] = await Promise.allSettled([
        api.get<Business>(`/businesses/${id}`),
        api.get<BusinessRiskAssessment>(`/businesses/${id}/risk-score`),
      ]);
      if (businessRes.status === "fulfilled") {
        setBusiness(businessRes.value);
      } else {
        setError(businessRes.reason instanceof Error ? businessRes.reason.message : "Failed to load company");
      }
      if (riskRes.status === "fulfilled") {
        setRiskAssessment(riskRes.value);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  function resetStatusDialog() {
    setStatusDialogOpen(false);
    setStatusSelection(STATUS_SELECT_PLACEHOLDER);
    setNextStatus(null);
    setStatusReason("");
  }

  function handleStatusChange(newStatus: string) {
    if (!business || !canManageBusinesses || newStatus === STATUS_SELECT_PLACEHOLDER) return;
    setStatusSelection(newStatus);
    setNextStatus(newStatus as BusinessStatus);
    setStatusReason("");
    setStatusDialogOpen(true);
  }

  async function confirmStatusChange() {
    if (!business || !canManageBusinesses || !nextStatus) return;
    setStatusUpdating(true);
    try {
      await api.patch(`/businesses/${id}/status`, {
        status: nextStatus,
        reason: statusReason.trim(),
      });
      await fetchBusiness();
      resetStatusDialog();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update company status.");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function confirmDeleteBusiness() {
    if (!business || !canManageBusinesses) return;
    setDeleting(true);
    try {
      await api.delete(`/businesses/${id}`, {
        reason: deleteReason.trim(),
      });
      setDeleteDialogOpen(false);
      setDeleteReason("");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete company.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpload(docType: DocumentType, file: File) {
    if (!canManageBusinesses) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", { description: "Maximum file size is 10 MB." });
      return;
    }
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
    return <p className="text-sm text-muted-foreground">Loading company...</p>;
  }

  if (error) {
    return <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>;
  }

  if (!business) {
    return <p className="text-sm text-destructive">Company not found.</p>;
  }

  const score = riskAssessment?.score ?? business.riskScore ?? 0;
  const riskBreakdown = riskAssessment?.breakdown;
  const missingDocuments = riskBreakdown?.missingDocumentTypes ?? [];
  const requiredDocumentTypes = referenceData?.requiredDocumentTypes ?? [];
  const uploadedDocumentCount = requiredDocumentTypes.filter((docType) =>
    business.documents.some((document) => document.type === docType),
  ).length;
  const activityLogEntries: ActivityLogEntry[] = [
    ...business.statusHistory.map((entry) => ({
      id: `status-${entry.id}`,
      kind: "status" as const,
      createdAt: entry.createdAt,
      title: `Status changed to ${STATUS_LABELS[entry.newStatus]}`,
      subtitle: entry.reason,
      actor: getActorName(entry.changedBy),
      actorInitials: getActorInitials(entry.changedBy),
    })),
    ...business.documents.map((document) => ({
      id: `document-${document.id}`,
      kind: "document" as const,
      createdAt: document.createdAt,
      title: `${formatDocumentTypeLabel(document.type)} uploaded`,
      subtitle: document.fileName,
      actor: null,
      actorInitials: null,
    })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8);
  const riskDrivers = [
    {
      label: "Jurisdiction signal",
      points: riskBreakdown?.countryRisk ?? 0,
      description:
        (riskBreakdown?.countryRisk ?? 0) > 0
          ? `${countryLabels[business.country] ?? business.country} is treated as a higher-risk jurisdiction in the current model.`
          : `${countryLabels[business.country] ?? business.country} adds no extra jurisdiction risk.`,
    },
    {
      label: "Industry signal",
      points: riskBreakdown?.industryRisk ?? 0,
      description:
        (riskBreakdown?.industryRisk ?? 0) > 0
          ? `${industryLabels[business.industry] ?? formatIndustry(business.industry)} is categorized as a higher-risk operating sector.`
          : `${industryLabels[business.industry] ?? formatIndustry(business.industry)} does not add sector-specific risk.`,
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
  const availableStatusActions = (business.allowedNextStatuses ?? []).map((status) => ({
    status,
    ...getStatusActionCopy(business.status, status),
  }));
  const selectedStatusAction = availableStatusActions.find((action) => action.status === nextStatus) ?? null;
  const getDocumentPath = (docId: string) => `/businesses/${id}/documents/${docId}/download`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Go Back
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            Companies
          </Link>
          <span>/</span>
          <span className="text-primary">{business.name}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">{business.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registration ID:{" "}
            <span className="font-mono text-primary">{business.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>
        <div className="flex max-w-md flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <StatusBadge status={business.status} />
            {canManageBusinesses && (
              <>
                <Select
                  value={statusSelection}
                  onValueChange={handleStatusChange}
                  disabled={statusUpdating || availableStatusActions.length === 0}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STATUS_SELECT_PLACEHOLDER} disabled>
                      {statusUpdating
                        ? "Updating..."
                        : availableStatusActions.length === 0
                          ? "No Next Action"
                          : "Choose Next Action"}
                    </SelectItem>
                    {availableStatusActions.map((action) => (
                      <SelectItem key={action.status} value={action.status}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleting}
                >
                  <Trash2 className="size-4" />
                  Delete Company
                </Button>
              </>
            )}
          </div>
          {canManageBusinesses && availableStatusActions.length > 0 && (
            <p className="text-right text-xs text-muted-foreground">
              Next step: {availableStatusActions.map((action) => action.label).join(" or ")}.
            </p>
          )}
          {!canManageBusinesses && (
            <p className="text-right text-xs text-muted-foreground">
              Read-only access. Status changes, document uploads, and deletions require an admin.
            </p>
          )}
        </div>
      </div>

      {canManageBusinesses && (
        <>
          <Dialog
            open={statusDialogOpen}
            onOpenChange={(open) => {
              if (!statusUpdating) {
                if (open) {
                  setStatusDialogOpen(true);
                  return;
                }

                resetStatusDialog();
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record status decision</DialogTitle>
                <DialogDescription>
                  Add an audit reason for moving this company from {STATUS_LABELS[business.status]} to{" "}
                  {nextStatus ? STATUS_LABELS[nextStatus] : "the selected status"}.
                  {selectedStatusAction ? ` ${selectedStatusAction.description}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Decision Reason
                </label>
                <Input
                  value={statusReason}
                  onChange={(event) => setStatusReason(event.target.value)}
                  placeholder="Describe the evidence or decision basis"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Compliance transitions require a short audit note of at least 10 characters.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetStatusDialog} disabled={statusUpdating}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void confirmStatusChange()}
                  disabled={statusUpdating || statusReason.trim().length < 10}
                >
                  {statusUpdating ? "Recording..." : "Record Status Change"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              if (deleting) {
                return;
              }

              setDeleteDialogOpen(open);
              if (!open) {
                setDeleteReason("");
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete company record</DialogTitle>
                <DialogDescription>Add a deletion reason before continuing.</DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Deletion Reason
                </label>
                <Input
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  placeholder="Explain why this company should be removed from active use"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  The record will be hidden from view, but safely kept in the system in case you need it later.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDeleteBusiness()}
                  disabled={deleting || deleteReason.trim().length < 10}
                >
                  {deleting ? "Deleting..." : "Delete Company"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left column — details + documents */}
        <div className="col-span-2 space-y-6">
          {/* Entity Details + Risk Analysis */}
          <div className="grid grid-cols-3 gap-6">
            <Card className="col-span-2">
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-bold tracking-tight mb-6">Entity Details</h2>
                <div className="grid grid-cols-2 gap-6">
                  <Detail label="Legal Name" value={business.name} />
                  <Detail
                    label="Jurisdiction"
                    value={
                      <CountryLabel
                        code={business.country}
                        label={countryLabels[business.country] ?? business.country}
                      />
                    }
                  />
                  <Detail label="Tax ID" value={business.taxIdentifier} />
                  <Detail
                    label="Industry"
                    value={industryLabels[business.industry] ?? formatIndustry(business.industry)}
                  />
                  <Detail label="Tax ID Validated" value={business.identifierValidated ? "Yes" : "No"} />
                </div>
              </CardContent>
            </Card>

            <RiskAnalysis score={score} drivers={riskDrivers} />
          </div>

          {/* Documents */}
          <Card>
            <CardContent className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold tracking-tight">
                  Compliance Documents{" "}
                  <span className="text-base font-medium text-muted-foreground">
                    ({uploadedDocumentCount}/{requiredDocumentTypes.length || "—"})
                  </span>
                </h2>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  PDF only
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {requiredDocumentTypes.length === 0 ? (
                  <div className="col-span-full rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                    Loading compliance document requirements...
                  </div>
                ) : requiredDocumentTypes.map((docType) => {
                  const doc = business.documents.find((document) => document.type === docType);
                  const isUploaded = !!doc;
                  const isUploading = uploading === docType;
                  const isDragActive = dragTarget === docType;
                  const documentLabel = formatDocumentTypeLabel(docType);

                  if (isUploaded) {
                    return (
                      <div key={docType} className="space-y-3">
                        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {documentLabel}
                        </p>

                        <div className="relative flex h-[360px] flex-col rounded-xl border bg-card p-3">
                          <div className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <CheckCircle2 className="size-4" />
                          </div>

                          <div className="min-h-0 overflow-hidden rounded-lg border bg-muted">
                            <ProtectedPdfFrame
                              key={doc.id}
                              path={getDocumentPath(doc.id)}
                              className="pointer-events-none h-52 w-full"
                              title={`${doc.fileName} first page`}
                              viewerHash={INLINE_PDF_VIEWER_HASH}
                              fallbackLabel="Unable to load document preview."
                            />
                          </div>

                          <div className="mt-4 min-h-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{doc.fileName}</p>
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
                                  <p className="mt-2 text-sm font-semibold text-foreground">{doc.fileName}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <InfoItem label="Type" value={documentLabel} />
                                  <InfoItem label="Size" value={formatBytes(doc.fileSize)} />
                                  <InfoItem label="Uploaded" value={formatDate(doc.createdAt)} />
                                  <InfoItem label="Format" value={doc.mimeType} />
                                </div>
                              </PopoverContent>
                            </Popover>

                            <Button size="sm" className="flex-1" onClick={() => setPreviewDocId(doc.id)}>
                              <Eye className="size-3.5" />
                              Full Preview
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={docType} className="space-y-3">
                      <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {documentLabel}
                      </p>

                      <div
                        className={`flex h-[360px] flex-col items-center justify-center rounded-xl bg-card p-6 text-center transition-colors ${
                          canManageBusinesses
                            ? `border-2 border-dashed ${isDragActive ? "border-primary bg-primary/5" : "border-border"}`
                            : "border border-border bg-muted/20"
                        }`}
                        onDragOver={(event) => {
                          if (!canManageBusinesses) return;
                          event.preventDefault();
                          setDragTarget(docType);
                        }}
                        onDragLeave={() => {
                          if (dragTarget === docType) {
                            setDragTarget(null);
                          }
                        }}
                        onDrop={(event) => {
                          if (!canManageBusinesses) return;
                          event.preventDefault();
                          setDragTarget(null);
                          const file = event.dataTransfer.files?.[0];
                          if (file) {
                            void handleUpload(docType, file);
                          }
                        }}
                      >
                        {canManageBusinesses ? (
                          <Plus className="size-12 text-muted-foreground/40" />
                        ) : (
                          <Info className="size-10 text-muted-foreground/50" />
                        )}
                        <p className="mt-2 max-w-[15rem] text-sm text-muted-foreground">
                          {canManageBusinesses
                            ? "Upload the missing PDF for this requirement."
                            : "This required document is not currently on file."}
                        </p>

                        {canManageBusinesses ? (
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
                        ) : (
                          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Read-only access
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — timeline */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight">Verification Journey</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A complete timeline of each verification decision.
                  </p>
                </div>
                <Badge variant="outline" className="bg-background">
                  {business.statusHistory.length} Events
                </Badge>
              </div>

              {business.statusHistory.length > 0 ? (
                <div className="relative pl-8">
                  {business.statusHistory.length > 1 && (
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border rounded-full" />
                  )}

                  <div className="space-y-5">
                    {[...business.statusHistory].reverse().map((entry, index) => (
                      <div key={entry.id} className="relative">
                        <div className="absolute -left-8 top-1 flex size-4 items-center justify-center">
                          <div
                            className={`size-3.5 rounded-full ring-2 ring-background ${
                              index === 0 ? "bg-primary" : "bg-muted-foreground/30"
                            }`}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={entry.newStatus} />
                          <span className="text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                        </div>

                        {entry.reason && (
                          <p className="mt-1.5 text-sm leading-6 text-foreground">{entry.reason}</p>
                        )}

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {entry.changedBy && (
                            <span className="inline-flex items-center gap-1.5">
                              <Avatar size="sm" className="size-5">
                                <AvatarFallback className="text-[10px] font-medium">
                                  {entry.changedBy.firstName[0]}{entry.changedBy.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              {entry.changedBy.firstName} {entry.changedBy.lastName}
                            </span>
                          )}
                          <span className="text-muted-foreground/50">&middot;</span>
                          <span>{formatDateTime(entry.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No verification events have been recorded yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
                Activity Log
              </h3>
              <div className="space-y-3">
                {activityLogEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{entry.title}</p>
                      {entry.subtitle && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{entry.subtitle}</p>
                      )}
                      {entry.actor && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Avatar size="sm" className="size-4">
                            <AvatarFallback className="text-[8px] font-medium">
                              {entry.actorInitials}
                            </AvatarFallback>
                          </Avatar>
                          By {entry.actor}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {entry.kind === "document" ? "Upload" : "Status"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</p>
                    </div>
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
            <ProtectedPdfFrame
              key={previewDocId}
              path={getDocumentPath(previewDocId)}
              className="size-full rounded-lg"
              title="Document preview"
              fallbackLabel="Unable to load document preview."
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1">{label}</p>
      <div className="text-sm font-medium capitalize">{value}</div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  FileWarning,
  Info,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { CountryLabel } from "@/components/country-flag";
import { RiskAnalysis } from "@/components/risk-analysis";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canManageComplianceRecords } from "@/lib/permissions";
import {
  buildCountryLabelMap,
  buildIndustryLabelMap,
  useBusinessReferenceData,
} from "@/lib/reference-data";
import { DocumentType } from "@/lib/types";
import type { Business, BusinessRiskAssessment } from "@/lib/types";

const DOCUMENT_TYPE_DETAILS: Record<
  DocumentType,
  {
    label: string;
    description: string;
  }
> = {
  [DocumentType.FISCAL_CERTIFICATE]: {
    label: "Tax Certificate",
    description: "Proof of tax status from national authority.",
  },
  [DocumentType.REGISTRATION_PROOF]: {
    label: "Proof of Registration",
    description: "Official company registration document.",
  },
  [DocumentType.INSURANCE_POLICY]: {
    label: "Insurance Policy",
    description: "Valid liability or worker insurance coverage.",
  },
};

function getDocumentRequirement(type: DocumentType): {
  type: DocumentType;
  label: string;
  description: string;
} {
  return {
    type,
    label:
      DOCUMENT_TYPE_DETAILS[type]?.label ??
      type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    description:
      DOCUMENT_TYPE_DETAILS[type]?.description ??
      "Required compliance document.",
  };
}

function formatIndustry(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type Step = "entity" | "documents" | "review";
const STEPS: { key: Step; label: string }[] = [
  { key: "entity", label: "Entity Data" },
  { key: "documents", label: "Compliance Docs" },
  { key: "review", label: "Verification" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { referenceData, loading: referenceDataLoading, error: referenceDataError } =
    useBusinessReferenceData();
  const canManageBusinesses = canManageComplianceRecords(user);
  const [step, setStep] = useState<Step>("entity");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Entity data
  const [name, setName] = useState("");
  const [taxIdentifier, setTaxIdentifier] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");

  // Documents
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<DocumentType, string>>>({});
  const [previewDocType, setPreviewDocType] = useState<DocumentType | null>(null);
  const [dragTarget, setDragTarget] = useState<DocumentType | null>(null);
  const [previewAssessment, setPreviewAssessment] =
    useState<BusinessRiskAssessment | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const countryLabels = buildCountryLabelMap(referenceData);
  const industryLabels = buildIndustryLabelMap(referenceData);
  const documentRequirements = (referenceData?.requiredDocumentTypes ?? []).map(
    getDocumentRequirement,
  );
  const missingDocuments = documentRequirements.filter(({ type }) => !files[type]);
  const attachedDocumentTypes = documentRequirements
    .filter(({ type }) => !!files[type])
    .map(({ type }) => type);

  useEffect(() => {
    if (!isLoading && !canManageBusinesses) {
      router.replace("/");
    }
  }, [canManageBusinesses, isLoading, router]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading access policy...</p>;
  }

  if (!canManageBusinesses) {
    return (
      <div className="max-w-2xl rounded-xl border bg-card p-8">
        <p className="text-xs font-semibold tracking-widest uppercase text-primary">
          Read-only Access
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Company registration is restricted
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Viewer accounts can inspect company records, documents, and audit history, but cannot
          create or modify onboarding files. Redirecting to the company registry.
        </p>
      </div>
    );
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  function addFile(type: DocumentType, file: File) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", { description: "Maximum file size is 10 MB." });
      return;
    }
    const url = URL.createObjectURL(file);
    setFiles((prev) => ({ ...prev, [type]: file }));
    setPreviews((prev) => ({ ...prev, [type]: url }));
  }

  function removeFile(type: DocumentType) {
    const url = previews[type];
    if (url) URL.revokeObjectURL(url);
    setFiles((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
    setPreviews((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  }

  function canContinue() {
    if (step === "entity") {
      return name && taxIdentifier && country && industry;
    }
    return true;
  }

  async function handleContinue() {
    if (step === "entity") {
      setError("");
      try {
        const check = await api.get<{ available: boolean; valid: boolean; message?: string }>(
          `/businesses/check-tax-id?taxIdentifier=${encodeURIComponent(taxIdentifier)}&country=${encodeURIComponent(country)}`
        );
        if (!check.available || !check.valid) {
          setError(check.message ?? "Tax identifier is not valid.");
          return;
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not validate tax identifier.");
        return;
      }
    }
    const nextStep = STEPS[stepIndex + 1].key;
    setStep(nextStep);
    if (nextStep === "review") {
      void loadRiskPreview();
    }
  }

  async function handleSubmit() {
    if (!name || !taxIdentifier || !country || !industry) return;
    setError("");
    setSubmitting(true);

    try {
      const created = await api.post<Business>("/businesses", {
        name,
        taxIdentifier,
        country,
        industry,
      });

      const failedUploads: string[] = [];

      for (const { type, label } of documentRequirements) {
        const file = files[type];
        if (!file) continue;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        try {
          await api.upload(
            `/businesses/${created.id}/documents`,
            formData,
          );
        } catch {
          failedUploads.push(label);
        }
      }

      if (failedUploads.length > 0) {
        toast.warning("Company created with pending document uploads", {
          description: `Finish uploading ${failedUploads.join(", ")} from the company page.`,
        });
      } else {
        toast.success("Company registered");
      }

      router.push(`/companies/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  async function loadRiskPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewAssessment(null);

    try {
      const assessment = await api.post<BusinessRiskAssessment>(
        "/businesses/risk-preview",
        {
        country,
        industry,
        documentTypes: attachedDocumentTypes,
        },
      );
      setPreviewAssessment(assessment);
    } catch (err) {
      setPreviewError(
        err instanceof ApiError ? err.message : "Risk preview unavailable.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  const previewUrl = previewDocType ? previews[previewDocType] : null;
  const packageState = previewAssessment
    ? getPackageState({
        missingDocumentCount: missingDocuments.length,
        requiresManualReview: previewAssessment.requiresManualReview,
        riskScore: previewAssessment.score,
      })
    : previewLoading
      ? {
          label: "Assessing Risk",
          description:
            "Generating the server-side compliance preview for this company package.",
          variant: "secondary" as const,
        }
      : {
          label: "Preview Pending",
          description:
            previewError ??
            "The backend preview will appear here before you submit the company.",
          variant: "secondary" as const,
        };
  const riskDrivers = previewAssessment
    ? [
        {
          label: "Jurisdiction",
          points: previewAssessment.breakdown.countryRisk,
          description:
            previewAssessment.breakdown.countryRisk > 0
              ? `${countryLabels[country] ?? country} is flagged as a higher-risk jurisdiction.`
              : `${countryLabels[country] ?? country} adds no jurisdiction penalty.`,
        },
        {
          label: "Industry",
          points: previewAssessment.breakdown.industryRisk,
          description:
            previewAssessment.breakdown.industryRisk > 0
              ? `${industryLabels[industry] ?? formatIndustry(industry)} is in the elevated-risk sector list.`
              : `${industryLabels[industry] ?? formatIndustry(industry)} does not add sector risk.`,
        },
        {
          label: "Document Coverage",
          points: previewAssessment.breakdown.documentationRisk,
          description:
            previewAssessment.breakdown.documentationRisk > 0
              ? `Missing ${missingDocuments.map((document) => document.label).join(", ")}.`
              : "All required PDFs are attached for submission.",
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-4 gap-8">
      {/* Left — stepper */}
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          New Company
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Onboarding Ledger
        </p>

        <nav className="mt-8 space-y-4">
          {STEPS.map((s, i) => {
            const isCurrent = s.key === step;
            const isDone = i < stepIndex;
            return (
              <button
                key={s.key}
                onClick={() => {
                  if (isDone) setStep(s.key);
                }}
                className={`flex items-center gap-3 text-left ${
                  isCurrent
                    ? "text-primary"
                    : isDone
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                    isCurrent
                      ? "bg-primary/10 text-primary"
                      : isDone
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="size-4" /> : i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {isCurrent
                      ? "Active"
                      : isDone
                        ? "Complete"
                        : "Pending"}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right — form content */}
      <div className="col-span-3 space-y-6">
        {(error || referenceDataError) && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error || referenceDataError}
          </div>
        )}

        {step === "entity" && (
          <Card>
            <CardContent className="p-8">
              <h2 className="font-display text-xl font-bold tracking-tight">
                Basic Entity Data
              </h2>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">
                Please provide the primary identification details for the legal
                entity you wish to register.
              </p>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-widest uppercase">
                    Legal Company Name
                  </label>
                  <Input
                    placeholder="e.g. Global Tech Solutions S."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-widest uppercase">
                    Tax ID
                  </label>
                  <Input
                    placeholder="Enter the company tax ID"
                    value={taxIdentifier}
                    onChange={(e) => setTaxIdentifier(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-widest uppercase">
                    Jurisdiction / Country
                  </label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger disabled={referenceDataLoading}>
                      {country ? (
                        <SelectValue>
                          <CountryLabel
                            code={country}
                            label={countryLabels[country] ?? country}
                          />
                        </SelectValue>
                      ) : (
                        <SelectValue placeholder="Select country" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
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
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-widest uppercase">
                    Industry Vertical
                  </label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger disabled={referenceDataLoading}>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {(referenceData?.industries ?? []).map((industryOption) => (
                        <SelectItem key={industryOption.key} value={industryOption.key}>
                          {industryOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "documents" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight">
                      Compliance Repository
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload official documentation. Files must be PDF and under
                      10MB.
                    </p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    PDF only
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {documentRequirements.length === 0 ? (
                    <div className="col-span-full rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                      Loading compliance document requirements...
                    </div>
                  ) : documentRequirements.map(({ type, label, description }) => {
                    const file = files[type];
                    const cardPreviewUrl = previews[type];
                    const isDragActive = dragTarget === type;

                    if (file && cardPreviewUrl) {
                      return (
                        <div
                          key={type}
                          className="relative flex h-[360px] flex-col rounded-xl border bg-card p-3"
                        >
                          <div className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <CheckCircle2 className="size-4" />
                          </div>

                          <div className="overflow-hidden rounded-lg border bg-muted">
                            <iframe
                              src={`${cardPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH`}
                              className="h-52 w-full pointer-events-none"
                              title={`${label} first page preview`}
                            />
                          </div>

                          <div className="mt-4 min-h-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {file.name}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Ready for submission
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
                                    {file.name}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <InfoItem label="Type" value={label} />
                                  <InfoItem label="Size" value={formatBytes(file.size)} />
                                  <InfoItem label="Format" value={file.type || "application/pdf"} />
                                  <InfoItem label="Status" value="Ready to submit" />
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => removeFile(type)}
                                >
                                  Remove file
                                </Button>
                              </PopoverContent>
                            </Popover>

                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => setPreviewDocType(type)}
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
                        key={type}
                        className={`flex h-[360px] flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-6 text-center transition-colors ${
                          isDragActive
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragTarget(type);
                        }}
                        onDragLeave={() => {
                          if (dragTarget === type) {
                            setDragTarget(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          setDragTarget(null);
                          const fileToUpload = event.dataTransfer.files?.[0];
                          if (fileToUpload) {
                            addFile(type, fileToUpload);
                          }
                        }}
                      >
                        <Plus className="size-12 text-muted-foreground/40" />
                        <p className="mt-5 text-sm font-semibold text-foreground">
                          {label}
                        </p>
                        <p className="mt-2 max-w-60 text-sm text-muted-foreground">
                          {description}
                        </p>

                        <label className="mt-6 cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(event) => {
                              const fileToUpload = event.target.files?.[0];
                              if (fileToUpload) {
                                addFile(type, fileToUpload);
                              }
                            }}
                          />
                          <Button variant="outline" size="sm" asChild>
                            <span>
                              <Upload className="size-3.5" />
                              Upload
                            </span>
                          </Button>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}


        {step === "review" && (
          <div className="space-y-6">
            {/* ── Header ── */}
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Confirm &amp; Submit
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review the details below before submitting for compliance review.
                  </p>
                  {packageState.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {packageState.description}
                    </p>
                  ) : null}
                </div>
                <Badge variant={packageState.variant} className="px-4 py-1.5 text-xs">
                  {packageState.label}
                </Badge>
              </CardContent>
            </Card>

            {/* ── Two-column body ── */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left: Entity + Documents */}
              <div className="flex flex-col gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="font-display text-lg font-bold tracking-tight mb-6">
                      Company Details
                    </h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <ReviewField label="Legal Name" value={name} />
                      <ReviewField label="Tax Identifier" value={taxIdentifier} />
                      <ReviewField
                        label="Country / Jurisdiction"
                        value={
                          <CountryLabel
                            code={country}
                            label={countryLabels[country] ?? country}
                          />
                        }
                      />
                      <ReviewField
                        label="Industry"
                        value={industryLabels[industry] ?? formatIndustry(industry)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h2 className="font-display text-lg font-bold tracking-tight mb-4">
                      Attached Documentation
                    </h2>
                    <div className="flex flex-col">
                      {documentRequirements.length === 0 ? (
                        <div className="py-4 text-sm text-muted-foreground">
                          Loading compliance document requirements...
                        </div>
                      ) : documentRequirements.map(({ type, label }) => {
                        const attached = !!files[type];
                        return (
                          <div key={type} className="flex items-center gap-4 py-4 border-b border-border/40 last:border-0">
                            <div className={`flex shrink-0 size-10 items-center justify-center rounded-full ${attached ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {attached ? <CheckCircle2 className="size-5" /> : <FileWarning className="size-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">{label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {attached ? "Uploaded successfully." : "Required for evaluation."}
                              </p>
                            </div>
                            <div className="shrink-0">
                              {attached ? (
                                <Badge variant="success" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-0">Complete</Badge>
                              ) : (
                                <Badge variant="warning" className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-0">Missing</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Risk Assessment */}
              <div>
                {previewAssessment ? (
                  <RiskAnalysis score={previewAssessment.score} drivers={riskDrivers} />
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="font-display text-lg font-bold tracking-tight">
                        Risk Analysis
                      </h2>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {previewLoading
                          ? "Generating a server-side risk preview using the current jurisdiction, industry, and attached documents."
                          : packageState.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-end gap-3">
          {stepIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(STEPS[stepIndex - 1].key)}
            >
              Back
            </Button>
          )}
          {step !== "review" ? (
            <Button
              onClick={handleContinue}
              disabled={!canContinue()}
            >
              Continue to {STEPS[stepIndex + 1].label}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for Review"}
            </Button>
          )}
        </div>
      </div>

      {previewUrl && previewDocType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative h-[80vh] w-full max-w-4xl rounded-xl bg-card p-2">
            <Button
              variant="outline"
              size="icon"
              className="absolute right-4 top-4 z-10"
              onClick={() => setPreviewDocType(null)}
            >
              <X className="size-4" />
            </Button>
            <iframe
              src={previewUrl}
              className="size-full rounded-lg"
              title={`Full preview ${documentRequirements.find((doc) => doc.type === previewDocType)?.label ?? "document"}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}


function getPackageState({
  missingDocumentCount,
  requiresManualReview,
  riskScore,
}: {
  missingDocumentCount: number;
  requiresManualReview: boolean;
  riskScore: number;
}): {
  label: string;
  description: string;
  variant: "success" | "warning" | "destructive" | "secondary";
} {
  if (missingDocumentCount > 0) {
    return {
      label: "Documents Missing",
      description:
        "The company record appears valid, but the missing PDFs will keep the file incomplete until they are attached.",
      variant: "warning",
    };
  }

  if (requiresManualReview) {
    return {
      label: "Manual Review Likely",
      description:
        "The company appears valid, but its current risk profile is high enough that compliance will likely route it to manual review.",
      variant: "destructive",
    };
  }

  if (riskScore >= 25) {
    return {
      label: "Elevated Profile",
      description:
        "The package is complete, although jurisdiction or industry signals still keep it above the low-risk band.",
      variant: "warning",
    };
  }

  return {
    label: "Ready to Submit",
    description:
      "All required inputs are present. Validation will occur upon submission.",
    variant: "success",
  };
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


function ReviewField({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs text-muted-foreground font-medium">
        {label}
      </span>
      <span className={`text-[15px] font-semibold text-foreground truncate ${valueClassName ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

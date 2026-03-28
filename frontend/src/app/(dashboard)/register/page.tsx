"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Eye,
  Info,
  Plus,
  Upload,
  X,
} from "lucide-react";
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
import { api, ApiError } from "@/lib/api";
import { DocumentType } from "@/lib/types";
import type { Business } from "@/lib/types";
import { COUNTRY_OPTIONS } from "@/lib/constants";

const INDUSTRY_OPTIONS = [
  "technology",
  "finance",
  "healthcare",
  "construction",
  "security",
  "currency_exchange",
  "casino",
  "manufacturing",
  "retail",
  "legal_services",
  "consulting",
  "education",
  "real_estate",
  "transportation",
  "agriculture",
  "energy",
];

const DOC_TYPES: {
  type: DocumentType;
  label: string;
  description: string;
}[] = [
  {
    type: DocumentType.FISCAL_CERTIFICATE,
    label: "Tax Certificate (Monotributo/IVA)",
    description: "Proof of tax status from national authority.",
  },
  {
    type: DocumentType.REGISTRATION_PROOF,
    label: "Proof of Registration",
    description: "Official company registration document.",
  },
  {
    type: DocumentType.INSURANCE_POLICY,
    label: "Insurance Policy (ART/Life)",
    description: "Valid liability or worker insurance coverage.",
  },
];

type Step = "entity" | "documents" | "review";
const STEPS: { key: Step; label: string }[] = [
  { key: "entity", label: "Entity Data" },
  { key: "documents", label: "Compliance Docs" },
  { key: "review", label: "Verification" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("entity");
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState("");

  // Entity data
  const [name, setName] = useState("");
  const [taxIdentifier, setTaxIdentifier] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");

  // Created business (persisted after entity step)
  const [business, setBusiness] = useState<Business | null>(null);

  // Documents
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<DocumentType, string>>>({});
  const [previewDocType, setPreviewDocType] = useState<DocumentType | null>(null);
  const [dragTarget, setDragTarget] = useState<DocumentType | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function addFile(type: DocumentType, file: File) {
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
    const nextStep = STEPS[stepIndex + 1].key;

    // On entity step, create the business first to catch validation errors early
    if (step === "entity" && !business) {
      setError("");
      setAdvancing(true);
      try {
        const created = await api.post<Business>("/businesses", {
          name,
          taxIdentifier,
          country,
          industry,
        });
        setBusiness(created);
        setStep(nextStep);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Something went wrong.",
        );
      } finally {
        setAdvancing(false);
      }
      return;
    }

    setStep(nextStep);
  }

  async function handleSubmit() {
    if (!business) return;
    setError("");
    setSubmitting(true);

    try {
      for (const [docType, file] of Object.entries(files)) {
        if (!file) continue;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", docType);
        await api.upload(
          `/businesses/${business.id}/documents`,
          formData,
        );
      }

      router.push(`/companies/${business.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const previewUrl = previewDocType ? previews[previewDocType] : null;

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
        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
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
                    CUIT / Tax ID Number
                  </label>
                  <Input
                    placeholder="30-12345678-9"
                    value={taxIdentifier}
                    onChange={(e) => setTaxIdentifier(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-widest uppercase">
                    Jurisdiction / Country
                  </label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind.replace(/_/g, " ")}
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
                  {DOC_TYPES.map(({ type, label, description }) => {
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
                        <p className="mt-2 max-w-[15rem] text-sm text-muted-foreground">
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
          <Card>
            <CardContent className="p-8">
              <h2 className="font-display text-xl font-bold tracking-tight">
                Review & Submit
              </h2>
              <p className="mt-1 mb-6 text-sm text-muted-foreground">
                Confirm all details before submitting for verification.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <ReviewItem label="Company Name" value={name} />
                <ReviewItem label="Tax Identifier" value={taxIdentifier} />
                <ReviewItem
                  label="Country"
                  value={
                    COUNTRY_OPTIONS.find((c) => c.value === country)?.label ??
                    country
                  }
                />
                <ReviewItem
                  label="Industry"
                  value={industry.replace(/_/g, " ")}
                />
              </div>

              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
                Documents
              </h3>
              <div className="space-y-2">
                {DOC_TYPES.map(({ type, label }) => (
                  <div
                    key={type}
                    className="flex items-center gap-2 text-sm"
                  >
                    {files[type] ? (
                      <CheckCircle2 className="size-4 text-primary" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground" />
                    )}
                    <span>{label}</span>
                    {files[type] && (
                      <span className="text-xs text-muted-foreground">
                        ({files[type].name})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
              disabled={!canContinue() || advancing}
            >
              {advancing ? "Validating..." : `Continue to ${STEPS[stepIndex + 1].label}`}
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
              title={`Full preview ${DOC_TYPES.find((doc) => doc.type === previewDocType)?.label ?? "document"}`}
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

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

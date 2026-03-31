"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { BusinessReferenceData } from "@/lib/types";

export function useBusinessReferenceData() {
  const [referenceData, setReferenceData] = useState<BusinessReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReferenceData() {
      try {
        const result = await api.get<BusinessReferenceData>("/businesses/reference-data");
        if (!cancelled) {
          setReferenceData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load compliance reference data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReferenceData();

    return () => {
      cancelled = true;
    };
  }, []);

  return { referenceData, loading, error };
}

export function buildCountryLabelMap(referenceData: BusinessReferenceData | null) {
  if (!referenceData) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    referenceData.countries.map((country) => [country.code, country.name]),
  ) as Record<string, string>;
}

export function buildIndustryLabelMap(referenceData: BusinessReferenceData | null) {
  if (!referenceData) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    referenceData.industries.map((industry) => [industry.key, industry.label]),
  ) as Record<string, string>;
}

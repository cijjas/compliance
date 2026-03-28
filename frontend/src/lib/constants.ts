export const COUNTRY_MAP: Record<string, string> = {
  AR: "Argentina",
  MX: "Mexico",
  BR: "Brazil",
  CL: "Chile",
  CO: "Colombia",
  UY: "Uruguay",
  PE: "Peru",
  US: "United States",
  ES: "Spain",
  CU: "Cuba",
  VE: "Venezuela",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
};

export const INDUSTRY_MAP: Record<string, string> = {
  technology: "Technology",
  finance: "Finance",
  healthcare: "Healthcare",
  construction: "Construction",
  retail: "Retail",
  manufacturing: "Manufacturing",
  education: "Education",
  security: "Security",
  currency_exchange: "Currency Exchange",
  casino: "Casino",
  agriculture: "Agriculture",
  logistics: "Logistics",
  consulting: "Consulting",
  real_estate: "Real Estate",
  energy: "Energy",
  fintech: "Fintech",
  legal_services: "Legal Services",
  supply_chain: "Supply Chain",
  software_development: "Software Development",
};

export function getCountryName(code: string): string {
  return COUNTRY_MAP[code] || code;
}

export function getIndustryName(key: string): string {
  return INDUSTRY_MAP[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

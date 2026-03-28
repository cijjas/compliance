const COUNTRY_LABELS: Record<string, string> = {
  AR: 'Argentina',
  BR: 'Brazil',
  MX: 'Mexico',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  ES: 'Spain',
  CL: 'Chile',
  CO: 'Colombia',
  UY: 'Uruguay',
  PE: 'Peru',
};

export function getCountryLabel(countryCode: string | null | undefined): string {
  if (!countryCode) return 'the selected country';

  return COUNTRY_LABELS[countryCode] ?? countryCode;
}

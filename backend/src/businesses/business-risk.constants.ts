import { DocumentType } from '../common/enums';

export const HIGH_RISK_COUNTRIES = new Set<string>([
  'CU',
  'IR',
  'KP',
  'SY',
  'MM',
  'VE',
  'AF',
  'YE',
] as const);

export const HIGH_RISK_INDUSTRIES = new Set<string>([
  'construction',
  'security',
  'currency_exchange',
  'casino',
  'gambling',
  'crypto',
] as const);

export const REQUIRED_DOCUMENT_TYPES: readonly DocumentType[] = [
  DocumentType.FISCAL_CERTIFICATE,
  DocumentType.REGISTRATION_PROOF,
  DocumentType.INSURANCE_POLICY,
];

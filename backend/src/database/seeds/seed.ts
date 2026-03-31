import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../common/entities/user.entity';
import { Business } from '../../common/entities/business.entity';
import { StatusHistory } from '../../common/entities/status-history.entity';
import { Document } from '../../common/entities/document.entity';
import { CountryPolicy } from '../../common/entities/country-policy.entity';
import { IndustryPolicy } from '../../common/entities/industry-policy.entity';
import {
  RiskSetting,
  RiskSettingKey,
} from '../../common/entities/risk-setting.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { BusinessStatus } from '../../common/enums/business-status.enum';
import { DocumentType } from '../../common/enums/document-type.enum';
import {
  REQUIRED_DOCUMENT_TYPES,
  calculateBusinessRiskAssessment,
} from '../../businesses/risk/business-risk.policy';
import dataSourceConfig from '../data-source';

const COUNTRIES = [
  'AR',
  'MX',
  'BR',
  'CL',
  'CO',
  'UY',
  'PE',
  'US',
  'ES',
  'CU',
  'VE',
];
const INDUSTRIES = [
  'technology',
  'finance',
  'healthcare',
  'construction',
  'retail',
  'manufacturing',
  'education',
  'security',
  'currency_exchange',
  'casino',
  'agriculture',
  'logistics',
  'consulting',
  'real_estate',
  'energy',
];
const STATUSES = [
  BusinessStatus.PENDING,
  BusinessStatus.IN_REVIEW,
  BusinessStatus.APPROVED,
  BusinessStatus.REJECTED,
];

function buildTaxIdentifier(country: string, index: number): string {
  switch (country) {
    case 'AR':
      return buildArgentinaTaxId(index);
    case 'MX':
      return buildMexicoTaxId(index);
    case 'BR':
      return buildBrazilTaxId(index);
    default:
      return `${country}-${String(index + 1).padStart(6, '0')}`;
  }
}

function buildArgentinaTaxId(index: number): string {
  const prefix = index % 2 === 0 ? '20' : '30';
  const body = String(12345670 + index).padStart(8, '0');
  const digits = `${prefix}${body}`.split('').map(Number);
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = multipliers.reduce((acc, mult, position) => {
    return acc + mult * digits[position];
  }, 0);
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

  return `${prefix}-${body}-${checkDigit}`;
}

function buildMexicoTaxId(index: number): string {
  const prefixes = ['CMP', 'FIN', 'TEC', 'LOG', 'IND', 'AGR'];
  const prefix = prefixes[index % prefixes.length];
  const month = String((index % 12) + 1).padStart(2, '0');
  const day = String((index % 28) + 1).padStart(2, '0');
  const suffix = (index + 100).toString(36).toUpperCase().padStart(3, '0');

  return `${prefix}24${month}${day}${suffix}`;
}

function buildBrazilTaxId(index: number): string {
  const cleaned = `${String(11222333 + index).padStart(8, '0')}${String(index + 1).padStart(4, '0')}${String((10 + index) % 100).padStart(2, '0')}`;

  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

async function seed() {
  const ds = new DataSource({ ...dataSourceConfig.options });
  await ds.initialize();
  console.log('Connected to database');

  const userRepo = ds.getRepository(User);
  const businessRepo = ds.getRepository(Business);
  const statusHistoryRepo = ds.getRepository(StatusHistory);
  const documentRepo = ds.getRepository(Document);
  const countryPolicyRepo = ds.getRepository(CountryPolicy);
  const industryPolicyRepo = ds.getRepository(IndustryPolicy);
  const riskSettingRepo = ds.getRepository(RiskSetting);

  const [countryPolicies, industryPolicies, riskSettings] = await Promise.all([
    countryPolicyRepo.find({ where: { isActive: true } }),
    industryPolicyRepo.find({ where: { isActive: true } }),
    riskSettingRepo.find(),
  ]);
  const documentationRiskSetting = riskSettings.find(
    (setting) => setting.key === RiskSettingKey.DOCUMENTATION_RISK_POINTS,
  );
  const manualReviewThresholdSetting = riskSettings.find(
    (setting) => setting.key === RiskSettingKey.MANUAL_REVIEW_THRESHOLD,
  );

  if (!documentationRiskSetting || !manualReviewThresholdSetting) {
    throw new Error(
      'Compliance risk settings are missing. Run migrations first.',
    );
  }

  const riskPolicy = {
    countryRiskPointsByCode: new Map(
      countryPolicies.map((country) => [country.code, country.riskPoints]),
    ),
    industryRiskPointsByKey: new Map(
      industryPolicies.map((industry) => [industry.key, industry.riskPoints]),
    ),
    documentationRiskPoints: documentationRiskSetting.numericValue,
    manualReviewThreshold: manualReviewThresholdSetting.numericValue,
    requiredDocumentTypes: REQUIRED_DOCUMENT_TYPES,
  };

  // Clear existing data (order matters for FK constraints)
  await documentRepo.createQueryBuilder().delete().execute();
  await statusHistoryRepo.createQueryBuilder().delete().execute();
  await businessRepo.createQueryBuilder().delete().execute();
  await userRepo.createQueryBuilder().delete().execute();

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const viewerPassword = await bcrypt.hash('viewer123', 10);

  const admin = await userRepo.save({
    email: 'admin@complif.com',
    password: adminPassword,
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
  });

  const viewer = await userRepo.save({
    email: 'viewer@complif.com',
    password: viewerPassword,
    firstName: 'Viewer',
    lastName: 'User',
    role: UserRole.VIEWER,
  });

  console.log('Created users');

  // Create 25 businesses
  const businessNames = [
    'TechnoSoft SA',
    'Constructora del Sur',
    'FinPlus SRL',
    'Casa de Cambio Express',
    'Pharma Life',
    'AgriCorp SA',
    'LogiTrans SRL',
    'EduTech SA',
    'SecureGuard SRL',
    'Casino Royal SA',
    'RetailMax SA',
    'ManuFactory SRL',
    'ConsultPro SA',
    'RealEstate Plus',
    'EnergiaSolar SA',
    'DataFlow SRL',
    'CloudNine SA',
    'HealthFirst SRL',
    'BuildRight SA',
    'TradeGlobal SA',
    'FoodChain SA',
    'GreenEnergy SRL',
    'SmartLogistics SA',
    'CryptoExchange SRL',
    'InnovateTech SA',
  ];

  for (let i = 0; i < businessNames.length; i++) {
    const status = STATUSES[i % STATUSES.length];
    const country = COUNTRIES[i % COUNTRIES.length];
    const industry = INDUSTRIES[i % INDUSTRIES.length];
    const taxIdentifier = buildTaxIdentifier(country, i);

    const docTypes = [
      DocumentType.FISCAL_CERTIFICATE,
      DocumentType.REGISTRATION_PROOF,
      DocumentType.INSURANCE_POLICY,
    ];
    const docsToAdd = docTypes.slice(0, 1 + (i % 3));
    const riskAssessment = calculateBusinessRiskAssessment(
      {
        country,
        industry,
        documentTypes: docsToAdd,
      },
      riskPolicy,
    );

    const business = await businessRepo.save({
      name: businessNames[i],
      taxIdentifier,
      country,
      industry,
      status,
      riskScore: riskAssessment.score,
      identifierValidated: true,
      createdById: i % 2 === 0 ? admin.id : viewer.id,
    });

    // Create status history
    await statusHistoryRepo.save({
      businessId: business.id,
      previousStatus: null,
      newStatus: BusinessStatus.PENDING,
      reason: 'Business created',
      changedById: admin.id,
    });

    if (status !== BusinessStatus.PENDING) {
      await statusHistoryRepo.save({
        businessId: business.id,
        previousStatus: BusinessStatus.PENDING,
        newStatus: status,
        reason: `Status changed to ${status}`,
        changedById: admin.id,
      });
    }

    // Add some mock documents
    for (const docType of docsToAdd) {
      await documentRepo.save({
        businessId: business.id,
        type: docType,
        fileName: `${docType}_${business.name.replace(/\s/g, '_')}.pdf`,
        filePath: `/uploads/seed/${docType}_${business.id}.pdf`,
        mimeType: 'application/pdf',
        fileSize: 250000 + i * 1000,
      });
    }
  }

  console.log(
    `Created ${businessNames.length} businesses with documents and status history`,
  );
  await ds.destroy();
  console.log('Seed completed');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

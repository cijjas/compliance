import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../common/entities/user.entity';
import { Business } from '../../common/entities/business.entity';
import { StatusHistory } from '../../common/entities/status-history.entity';
import { Document } from '../../common/entities/document.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { BusinessStatus } from '../../common/enums/business-status.enum';
import { DocumentType } from '../../common/enums/document-type.enum';
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

async function seed() {
  const ds = new DataSource({ ...dataSourceConfig.options });
  await ds.initialize();
  console.log('Connected to database');

  const userRepo = ds.getRepository(User);
  const businessRepo = ds.getRepository(Business);
  const statusHistoryRepo = ds.getRepository(StatusHistory);
  const documentRepo = ds.getRepository(Document);

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
    const cuitBase = (20000000000 + i * 1000000).toString();

    const business = await businessRepo.save({
      name: businessNames[i],
      taxIdentifier: `${cuitBase.slice(0, 2)}-${cuitBase.slice(2, 10)}-${cuitBase.slice(10)}`,
      country,
      industry,
      status,
      riskScore: Math.floor(Math.random() * 100),
      identifierValidated: Math.random() > 0.3,
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
    const docTypes = [
      DocumentType.FISCAL_CERTIFICATE,
      DocumentType.REGISTRATION_PROOF,
      DocumentType.INSURANCE_POLICY,
    ];
    const docsToAdd = docTypes.slice(0, 1 + (i % 3));
    for (const docType of docsToAdd) {
      await documentRepo.save({
        businessId: business.id,
        type: docType,
        fileName: `${docType}_${business.name.replace(/\s/g, '_')}.pdf`,
        filePath: `/uploads/seed/${docType}_${business.id}.pdf`,
        mimeType: 'application/pdf',
        fileSize: Math.floor(Math.random() * 5000000) + 100000,
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

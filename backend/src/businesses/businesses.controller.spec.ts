import { Test, TestingModule } from '@nestjs/testing';
import { BusinessStatus, UserRole } from '../common/enums';
import type { Business } from '../common/entities';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { DeleteBusinessDto } from './dto/delete-business.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { PreviewRiskDto } from './dto/preview-risk.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { BusinessReferenceData } from './reference-data.service';

function buildMockBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: '8f5f6fa8-c6cf-4df2-9107-b29339af22a6',
    name: 'Acme Corp SA',
    taxIdentifier: '20-12345678-6',
    country: 'AR',
    industry: 'technology',
    status: BusinessStatus.PENDING,
    riskScore: null,
    identifierValidated: false,
    createdBy: null,
    createdById: null,
    documents: [],
    statusHistory: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('BusinessesController', () => {
  let controller: BusinessesController;
  let businessesService: jest.Mocked<
    Pick<
      BusinessesService,
      | 'create'
      | 'findAll'
      | 'findOne'
      | 'checkTaxIdentifier'
      | 'previewRiskScore'
      | 'updateStatus'
      | 'remove'
      | 'getRiskScore'
      | 'getStats'
      | 'getReferenceData'
    >
  >;

  beforeEach(async () => {
    businessesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      checkTaxIdentifier: jest.fn(),
      previewRiskScore: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      getRiskScore: jest.fn(),
      getStats: jest.fn(),
      getReferenceData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessesController],
      providers: [{ provide: BusinessesService, useValue: businessesService }],
    }).compile();

    controller = module.get(BusinessesController);
  });

  it('create delegates to the businesses service', async () => {
    const dto: CreateBusinessDto = {
      name: 'Acme Corp SA',
      taxIdentifier: '20-12345678-6',
      country: 'AR',
      industry: 'technology',
    };
    const user: AuthenticatedUser = {
      id: 'user-1',
      email: 'admin@complif.com',
      role: UserRole.ADMIN,
    };
    const result = buildMockBusiness({ createdById: user.id });
    businessesService.create.mockResolvedValue(result);

    await expect(controller.create(dto, user)).resolves.toEqual(result);
    expect(businessesService.create).toHaveBeenCalledWith(dto, user.id);
  });

  it('findAll delegates filters and pagination to the businesses service', async () => {
    const query: ListBusinessesDto = {
      status: undefined,
      country: 'AR',
      search: 'Acme',
      page: 2,
      limit: 10,
    };
    const result = { data: [], total: 0, page: 2, limit: 10, totalPages: 0 };
    businessesService.findAll.mockResolvedValue(result);

    await expect(controller.findAll(query)).resolves.toEqual(result);
    expect(businessesService.findAll).toHaveBeenCalledWith(query);
  });

  it('findOne delegates to the businesses service', async () => {
    const result = buildMockBusiness();
    businessesService.findOne.mockResolvedValue(result);

    await expect(
      controller.findOne('8f5f6fa8-c6cf-4df2-9107-b29339af22a6'),
    ).resolves.toEqual(result);
    expect(businessesService.findOne).toHaveBeenCalledWith(
      '8f5f6fa8-c6cf-4df2-9107-b29339af22a6',
    );
  });

  it('checkTaxId delegates to the businesses service', async () => {
    const result = {
      available: true,
      valid: true,
    };
    businessesService.checkTaxIdentifier.mockResolvedValue(result);

    await expect(controller.checkTaxId('20-12345678-6', 'AR')).resolves.toEqual(
      result,
    );
    expect(businessesService.checkTaxIdentifier).toHaveBeenCalledWith(
      '20-12345678-6',
      'AR',
    );
  });

  it('previewRiskScore delegates to the businesses service', async () => {
    const dto: PreviewRiskDto = {
      country: 'AR',
      industry: 'technology',
      documentTypes: [],
    };
    const result = {
      score: 20,
      requiresManualReview: false,
      breakdown: {
        countryRisk: 0,
        industryRisk: 0,
        documentationRisk: 20,
        missingDocumentTypes: [],
      },
    };
    businessesService.previewRiskScore.mockResolvedValue(result);

    await expect(controller.previewRiskScore(dto)).resolves.toEqual(result);
    expect(businessesService.previewRiskScore).toHaveBeenCalledWith(dto);
  });

  it('updateStatus delegates to the businesses service', async () => {
    const dto: UpdateStatusDto = {
      status: 'approved' as UpdateStatusDto['status'],
      reason: 'All checks passed',
    };
    const user: AuthenticatedUser = {
      id: 'admin-1',
      email: 'admin@complif.com',
      role: UserRole.ADMIN,
    };
    const result = buildMockBusiness({ status: BusinessStatus.APPROVED });
    businessesService.updateStatus.mockResolvedValue(result);

    await expect(
      controller.updateStatus(
        '8f5f6fa8-c6cf-4df2-9107-b29339af22a6',
        dto,
        user,
      ),
    ).resolves.toEqual(result);
    expect(businessesService.updateStatus).toHaveBeenCalledWith(
      '8f5f6fa8-c6cf-4df2-9107-b29339af22a6',
      dto,
      user.id,
    );
  });

  it('remove delegates to the businesses service', async () => {
    const dto: DeleteBusinessDto = {
      reason: 'Duplicate onboarding record archived for audit retention.',
    };
    const user: AuthenticatedUser = {
      id: 'admin-1',
      email: 'admin@complif.com',
      role: UserRole.ADMIN,
    };
    businessesService.remove.mockResolvedValue(undefined);

    await expect(
      controller.remove('8f5f6fa8-c6cf-4df2-9107-b29339af22a6', dto, user),
    ).resolves.toBeUndefined();
    expect(businessesService.remove).toHaveBeenCalledWith(
      '8f5f6fa8-c6cf-4df2-9107-b29339af22a6',
      dto,
      user.id,
    );
  });

  it('getRiskScore delegates to the businesses service', async () => {
    const result = {
      businessId: '8f5f6fa8-c6cf-4df2-9107-b29339af22a6',
      score: 55,
      requiresManualReview: false,
      breakdown: {
        countryRisk: 30,
        industryRisk: 25,
        documentationRisk: 0,
        missingDocumentTypes: [],
      },
    };
    businessesService.getRiskScore.mockResolvedValue(result);

    await expect(
      controller.getRiskScore('8f5f6fa8-c6cf-4df2-9107-b29339af22a6'),
    ).resolves.toEqual(result);
    expect(businessesService.getRiskScore).toHaveBeenCalledWith(
      '8f5f6fa8-c6cf-4df2-9107-b29339af22a6',
    );
  });

  it('getStats delegates to the businesses service', async () => {
    const result = {
      total: 25,
      byStatus: { pending: 10, in_review: 5, approved: 8, rejected: 2 },
      avgApprovalDays: 3.2,
      complianceRate: 0.8,
    };
    businessesService.getStats.mockResolvedValue(result);

    await expect(controller.getStats()).resolves.toEqual(result);
    expect(businessesService.getStats).toHaveBeenCalled();
  });

  it('getReferenceData delegates to the businesses service', async () => {
    const result: BusinessReferenceData = {
      countries: [{ code: 'AR', name: 'Argentina', riskPoints: 0 }],
      industries: [{ key: 'technology', label: 'Technology', riskPoints: 0 }],
      riskSettings: {
        documentationRiskPoints: 20,
        manualReviewThreshold: 70,
      },
      requiredDocumentTypes: [],
    };
    businessesService.getReferenceData.mockResolvedValue(result);

    await expect(controller.getReferenceData()).resolves.toEqual(result);
    expect(businessesService.getReferenceData).toHaveBeenCalled();
  });
});

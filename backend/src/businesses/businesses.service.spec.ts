import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, Repository, type SelectQueryBuilder } from 'typeorm';
import { Business } from '../common/entities';
import { BusinessStatus } from '../common/enums';
import { BusinessIdentifierValidationService } from './validation/business-identifier-validation.service';
import { RiskAssessmentService, RiskAssessment } from '../risk-scoring';
import { BusinessStatusNotifierService } from './notifier/business-status-notifier.service';
import {
  BusinessReferenceData,
  BusinessReferenceDataService,
} from './reference-data.service';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { PreviewRiskDto } from './dto/preview-risk.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

type TransactionManagerMock = {
  getRepository: (entity: unknown) => unknown;
};

type TransactionHandler = (manager: TransactionManagerMock) => Promise<unknown>;

describe('BusinessesService', () => {
  let service: BusinessesService;
  let businessRepo: jest.Mocked<
    Pick<Repository<Business>, 'findOne' | 'createQueryBuilder'>
  >;
  let listQueryBuilder: {
    andWhere: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    addOrderBy: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getOne: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let dataSource: {
    transaction: jest.MockedFunction<
      (handler: TransactionHandler) => Promise<unknown>
    >;
    createQueryBuilder: jest.Mock;
  };
  let riskAssessmentService: jest.Mocked<
    Pick<
      RiskAssessmentService,
      | 'refreshBusinessRiskScore'
      | 'calculateAssessment'
      | 'calculateBusinessAssessment'
    >
  >;
  let referenceDataService: jest.Mocked<
    Pick<
      BusinessReferenceDataService,
      | 'assertActiveCountry'
      | 'assertSupportedBusinessProfile'
      | 'getReferenceData'
    >
  >;
  let identifierValidationService: jest.Mocked<
    Pick<BusinessIdentifierValidationService, 'validate'>
  >;
  let notifier: jest.Mocked<
    Pick<BusinessStatusNotifierService, 'notifyStatusChanged'>
  >;

  beforeEach(() => {
    listQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
    };
    businessRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(listQueryBuilder),
    };
    dataSource = {
      transaction: jest.fn() as jest.MockedFunction<
        (handler: TransactionHandler) => Promise<unknown>
      >,
      createQueryBuilder: jest.fn(),
    };
    riskAssessmentService = {
      refreshBusinessRiskScore: jest.fn(),
      calculateAssessment: jest.fn(),
      calculateBusinessAssessment: jest.fn(),
    };
    referenceDataService = {
      assertActiveCountry: jest.fn().mockResolvedValue({
        code: 'AR',
        name: 'Argentina',
      }),
      assertSupportedBusinessProfile: jest.fn().mockResolvedValue({
        country: {
          code: 'AR',
          name: 'Argentina',
        },
        industry: {
          key: 'technology',
          label: 'Technology',
        },
      }),
      getReferenceData: jest.fn(),
    };
    identifierValidationService = {
      validate: jest.fn(),
    };
    notifier = {
      notifyStatusChanged: jest.fn(),
    };

    service = new BusinessesService(
      businessRepo as unknown as Repository<Business>,
      dataSource as unknown as DataSource,
      referenceDataService as unknown as BusinessReferenceDataService,
      riskAssessmentService as unknown as RiskAssessmentService,
      identifierValidationService as unknown as BusinessIdentifierValidationService,
      notifier as unknown as BusinessStatusNotifierService,
    );
  });

  describe('checkTaxIdentifier', () => {
    it('returns available when no duplicate exists and format is valid', async () => {
      referenceDataService.assertActiveCountry = jest
        .fn()
        .mockResolvedValue({ code: 'AR', name: 'Argentina' });
      businessRepo.findOne.mockResolvedValue(null);
      identifierValidationService.validate.mockResolvedValue({
        valid: true,
        country: 'AR',
        format: '11 digits (for example 20-12345678-6)',
      });

      const result = await service.checkTaxIdentifier('20-12345678-9', 'AR');

      expect(result).toEqual({ available: true, valid: true });
      expect(referenceDataService.assertActiveCountry).toHaveBeenCalledWith(
        'AR',
      );
      expect(identifierValidationService.validate).toHaveBeenCalledWith(
        '20-12345678-9',
        'AR',
      );
    });

    it('returns unavailable when the identifier already belongs to an active business', async () => {
      referenceDataService.assertActiveCountry = jest
        .fn()
        .mockResolvedValue({ code: 'AR', name: 'Argentina' });
      businessRepo.findOne.mockResolvedValue({
        id: 'existing',
        deletedAt: null,
      } as Business);

      const result = await service.checkTaxIdentifier('20-12345678-9', 'AR');

      expect(result).toEqual({
        available: false,
        valid: true,
        message: 'Business with this tax identifier already exists',
      });
      expect(identifierValidationService.validate).not.toHaveBeenCalled();
    });

    it('returns unavailable with an archive message when the identifier belongs to a deleted business', async () => {
      referenceDataService.assertActiveCountry = jest
        .fn()
        .mockResolvedValue({ code: 'AR', name: 'Argentina' });
      businessRepo.findOne.mockResolvedValue({
        id: 'archived',
        deletedAt: new Date(),
      } as Business);

      const result = await service.checkTaxIdentifier('20-12345678-9', 'AR');

      expect(result.available).toBe(false);
      expect(result.valid).toBe(true);
      expect(result.message).toContain('archived');
    });

    it('returns invalid when the format validation fails', async () => {
      referenceDataService.assertActiveCountry = jest
        .fn()
        .mockResolvedValue({ code: 'AR', name: 'Argentina' });
      businessRepo.findOne.mockResolvedValue(null);
      identifierValidationService.validate.mockResolvedValue({
        valid: false,
        country: 'AR',
        format: '11 digits (for example 20-12345678-6)',
        failureReason: 'invalid_format',
      });

      const result = await service.checkTaxIdentifier('bad-id', 'AR');

      expect(result).toEqual({
        available: false,
        valid: false,
        message: expect.stringContaining('Argentina tax ID'),
      });
    });
  });

  it('creates a business, records initial history, and refreshes the risk score', async () => {
    const dto: CreateBusinessDto = {
      name: 'Acme Corp',
      taxIdentifier: '20-12345678-9',
      country: 'AR',
      industry: 'technology',
    };
    const savedBusiness = {
      id: 'business-1',
      ...dto,
      identifierValidated: true,
      status: BusinessStatus.PENDING,
    } as Business;

    const transactionBusinessRepo = {
      create: jest.fn().mockReturnValue(savedBusiness),
      save: jest.fn().mockResolvedValue(savedBusiness),
    };
    const transactionStatusHistoryRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    businessRepo.findOne.mockResolvedValue(null);
    identifierValidationService.validate.mockResolvedValue({
      valid: true,
      country: 'AR',
      format: '11 digits (for example 20-12345678-6)',
    });
    dataSource.transaction.mockImplementation((handler) =>
      handler({
        getRepository: (entity: unknown) =>
          entity === Business
            ? transactionBusinessRepo
            : transactionStatusHistoryRepo,
      }),
    );
    const savedBusinessWithMetadata = { ...savedBusiness, allowedNextStatuses: [] };
    jest.spyOn(service, 'findOne').mockResolvedValue(savedBusinessWithMetadata);

    await expect(service.create(dto, 'user-1')).resolves.toBe(savedBusinessWithMetadata);

    expect(
      referenceDataService.assertSupportedBusinessProfile,
    ).toHaveBeenCalledWith(dto.country, dto.industry);
    expect(identifierValidationService.validate).toHaveBeenCalledWith(
      dto.taxIdentifier,
      'AR',
    );
    expect(transactionBusinessRepo.create).toHaveBeenCalledWith({
      ...dto,
      country: 'AR',
      industry: 'technology',
      createdById: 'user-1',
      identifierValidated: true,
      status: BusinessStatus.PENDING,
    });
    expect(transactionStatusHistoryRepo.save).toHaveBeenCalledWith({
      businessId: savedBusiness.id,
      previousStatus: null,
      newStatus: BusinessStatus.PENDING,
      reason: 'Business created',
      changedById: 'user-1',
    });
    expect(riskAssessmentService.refreshBusinessRiskScore).toHaveBeenCalledWith(
      savedBusiness.id,
    );
  });

  it('rejects duplicate tax identifiers before creating a business', async () => {
    businessRepo.findOne.mockResolvedValue({
      id: 'existing-business',
    } as Business);

    await expect(
      service.create(
        {
          name: 'Acme Corp',
          taxIdentifier: '20-12345678-9',
          country: 'AR',
          industry: 'technology',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(
      referenceDataService.assertSupportedBusinessProfile,
    ).toHaveBeenCalledWith('AR', 'technology');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects creation when the tax identifier is invalid for the country', async () => {
    const dto: CreateBusinessDto = {
      name: 'Acme Corp',
      taxIdentifier: 'invalid-id',
      country: 'AR',
      industry: 'technology',
    };

    businessRepo.findOne.mockResolvedValue(null);
    identifierValidationService.validate.mockResolvedValue({
      valid: false,
      country: 'AR',
      format: '11 digits (for example 20-12345678-6)',
      failureReason: 'invalid_format',
    });

    await expect(service.create(dto, 'user-1')).rejects.toThrow(
      'Tax identifier "invalid-id" is not a valid Argentina tax ID. Expected format: 11 digits (for example 20-12345678-6).',
    );

    expect(identifierValidationService.validate).toHaveBeenCalledWith(
      dto.taxIdentifier,
      'AR',
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(riskAssessmentService.refreshBusinessRiskScore).not.toHaveBeenCalled();
  });

  it('explains when a tax identifier has the right format but fails the verification digit', async () => {
    const dto: CreateBusinessDto = {
      name: 'Acme Corp',
      taxIdentifier: '30-42878049-2',
      country: 'AR',
      industry: 'technology',
    };

    businessRepo.findOne.mockResolvedValue(null);
    identifierValidationService.validate.mockResolvedValue({
      valid: false,
      country: 'AR',
      format: '11 digits (for example 20-12345678-6)',
      failureReason: 'invalid_checksum',
    });

    await expect(service.create(dto, 'user-1')).rejects.toThrow(
      'Tax identifier "30-42878049-2" is not a valid Argentina tax ID. Expected format: 11 digits (for example 20-12345678-6).',
    );

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(riskAssessmentService.refreshBusinessRiskScore).not.toHaveBeenCalled();
  });

  it('searches by company name, business id, and tax identifier', async () => {
    listQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    await expect(
      service.findAll({
        search: '20-12345678',
        page: 1,
        limit: 10,
      }),
    ).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    expect(businessRepo.createQueryBuilder).toHaveBeenCalledWith('b');
    expect(listQueryBuilder.andWhere).toHaveBeenCalledWith(
      "(b.name ILIKE :search OR CAST(b.id AS text) ILIKE :search OR b.tax_identifier ILIKE :search OR REPLACE(REPLACE(REPLACE(b.tax_identifier, '-', ''), '.', ''), '/', '') ILIKE :normalizedSearch)",
      {
        search: '%20-12345678%',
        normalizedSearch: '%2012345678%',
      },
    );
  });

  it('returns workflow metadata with the backend-approved next statuses', async () => {
    listQueryBuilder.getOne.mockResolvedValue({
      id: 'business-1',
      name: 'Acme Corp',
      status: BusinessStatus.PENDING,
      documents: [],
      statusHistory: [],
    } as unknown as Business);

    await expect(service.findOne('business-1')).resolves.toMatchObject({
      id: 'business-1',
      status: BusinessStatus.PENDING,
      allowedNextStatuses: [
        BusinessStatus.IN_REVIEW,
        BusinessStatus.REJECTED,
      ],
    });

    expect(businessRepo.createQueryBuilder).toHaveBeenCalledWith('b');
    expect(listQueryBuilder.where).toHaveBeenCalledWith('b.id = :id', {
      id: 'business-1',
    });
  });

  it('surfaces microservice outages as service-unavailable instead of invalid data', async () => {
    businessRepo.findOne.mockResolvedValue(null);
    identifierValidationService.validate.mockRejectedValue(
      new ServiceUnavailableException('temporary outage'),
    );

    await expect(
      service.create(
        {
          name: 'Acme Corp',
          taxIdentifier: '20-12345678-9',
          country: 'AR',
          industry: 'technology',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(riskAssessmentService.refreshBusinessRiskScore).not.toHaveBeenCalled();
  });

  it('updates status inside a transaction and emits a structured notification', async () => {
    const currentBusiness = {
      id: 'business-1',
      name: 'Acme Corp',
      status: BusinessStatus.IN_REVIEW,
      allowedNextStatuses: [BusinessStatus.APPROVED, BusinessStatus.REJECTED],
    } as Business & { allowedNextStatuses: BusinessStatus[] };
    const updatedBusiness = {
      ...currentBusiness,
      status: BusinessStatus.APPROVED,
      allowedNextStatuses: [BusinessStatus.IN_REVIEW],
    } as Business & { allowedNextStatuses: BusinessStatus[] };
    const dto: UpdateStatusDto = {
      status: BusinessStatus.APPROVED,
      reason: 'All checks passed',
    };

    const transactionBusinessRepo = {
      update: jest.fn().mockResolvedValue(undefined),
    };
    const transactionStatusHistoryRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(currentBusiness)
      .mockResolvedValueOnce(updatedBusiness);
    dataSource.transaction.mockImplementation((handler) =>
      handler({
        getRepository: (entity: unknown) =>
          entity === Business
            ? transactionBusinessRepo
            : transactionStatusHistoryRepo,
      }),
    );

    await expect(
      service.updateStatus(currentBusiness.id, dto, 'admin-1'),
    ).resolves.toBe(updatedBusiness);

    expect(transactionBusinessRepo.update).toHaveBeenCalledWith(
      currentBusiness.id,
      {
        status: BusinessStatus.APPROVED,
      },
    );
    expect(transactionStatusHistoryRepo.save).toHaveBeenCalledWith({
      businessId: currentBusiness.id,
      previousStatus: BusinessStatus.IN_REVIEW,
      newStatus: BusinessStatus.APPROVED,
      reason: 'All checks passed',
      changedById: 'admin-1',
    });
    expect(notifier.notifyStatusChanged).toHaveBeenCalledWith({
      businessId: currentBusiness.id,
      businessName: currentBusiness.name,
      previousStatus: BusinessStatus.IN_REVIEW,
      newStatus: BusinessStatus.APPROVED,
      changedById: 'admin-1',
    });
  });

  it('rejects repeated status updates', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'business-1',
      name: 'Acme Corp',
      status: BusinessStatus.PENDING,
      allowedNextStatuses: [BusinessStatus.IN_REVIEW, BusinessStatus.REJECTED],
    } as Business & { allowedNextStatuses: BusinessStatus[] });

    await expect(
      service.updateStatus(
        'business-1',
        {
          status: BusinessStatus.PENDING,
          reason: 'Attempted duplicate update for testing',
        },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(notifier.notifyStatusChanged).not.toHaveBeenCalled();
  });

  it('rejects status transitions that skip the compliance workflow', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'business-1',
      name: 'Acme Corp',
      status: BusinessStatus.PENDING,
      allowedNextStatuses: [BusinessStatus.IN_REVIEW, BusinessStatus.REJECTED],
    } as Business & { allowedNextStatuses: BusinessStatus[] });

    await expect(
      service.updateStatus(
        'business-1',
        {
          status: BusinessStatus.APPROVED,
          reason: 'Attempted shortcut',
        },
        'admin-1',
      ),
    ).rejects.toThrow(
      'Cannot move this business from "Pending" to "Approved". Allowed next statuses: "In Review", "Rejected".',
    );

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(notifier.notifyStatusChanged).not.toHaveBeenCalled();
  });

  it('soft deletes a business and records the deletion audit fields', async () => {
    businessRepo.findOne.mockResolvedValue({
      id: 'business-1',
      name: 'Acme Corp',
      deletedAt: null,
    } as Business);

    const transactionBusinessRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };

    dataSource.transaction.mockImplementation((handler) =>
      handler({
        getRepository: () => transactionBusinessRepo,
      }),
    );

    await expect(
      service.remove(
        'business-1',
        {
          reason: 'Duplicate case created during QA. Archived instead of hard deleting.',
        },
        'admin-1',
      ),
    ).resolves.toBeUndefined();

    expect(businessRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'business-1' },
      withDeleted: true,
    });
    expect(transactionBusinessRepo.update).toHaveBeenCalledWith('business-1', {
      deletionReason:
        'Duplicate case created during QA. Archived instead of hard deleting.',
      deletedById: 'admin-1',
    });
    expect(transactionBusinessRepo.softDelete).toHaveBeenCalledWith(
      'business-1',
    );
  });

  it('returns a risk preview using the centralized policy', async () => {
    const assessment: RiskAssessment = {
      score: 20,
      requiresManualReview: false,
      breakdown: {
        countryRisk: 0,
        industryRisk: 0,
        documentationRisk: 20,
        missingDocumentTypes: [],
      },
    };
    riskAssessmentService.calculateAssessment.mockResolvedValue(assessment);

    const dto: PreviewRiskDto = {
      country: 'AR',
      industry: 'technology',
      documentTypes: [],
    };

    await expect(service.previewRiskScore(dto)).resolves.toEqual(assessment);
    expect(
      referenceDataService.assertSupportedBusinessProfile,
    ).toHaveBeenCalledWith(dto.country, dto.industry);
    expect(riskAssessmentService.calculateAssessment).toHaveBeenCalledWith(dto);
  });

  it('returns backend-owned compliance reference data', async () => {
    const referenceData: BusinessReferenceData = {
      countries: [{ code: 'AR', name: 'Argentina', riskPoints: 0 }],
      industries: [{ key: 'technology', label: 'Technology', riskPoints: 0 }],
      riskSettings: {
        documentationRiskPoints: 20,
        manualReviewThreshold: 70,
      },
      requiredDocumentTypes: [],
    };
    referenceDataService.getReferenceData.mockResolvedValue(referenceData);

    await expect(service.getReferenceData()).resolves.toEqual(referenceData);
    expect(referenceDataService.getReferenceData).toHaveBeenCalled();
  });

  it('getStats aggregates counts, average approval time, and compliance rate', async () => {
    const countQb = {
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(25),
    };
    const statusQb = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { status: BusinessStatus.PENDING, count: 10 },
        { status: BusinessStatus.IN_REVIEW, count: 5 },
        { status: BusinessStatus.APPROVED, count: 8 },
        { status: BusinessStatus.REJECTED, count: 2 },
      ]),
    };
    const avgQb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ days: '3.24567' }),
    };

    businessRepo.createQueryBuilder
      .mockReturnValueOnce(countQb as unknown as SelectQueryBuilder<Business>)
      .mockReturnValueOnce(statusQb as unknown as SelectQueryBuilder<Business>);
    dataSource.createQueryBuilder.mockReturnValue(avgQb);

    const result = await service.getStats();

    expect(result).toEqual({
      total: 25,
      byStatus: {
        pending: 10,
        in_review: 5,
        approved: 8,
        rejected: 2,
      },
      avgApprovalDays: 3.2,
      complianceRate: 0.8,
    });
  });
});

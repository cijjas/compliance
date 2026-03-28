import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Business } from '../common/entities';
import { BusinessStatus } from '../common/enums';
import { BusinessIdentifierValidationService } from './business-identifier-validation.service';
import { BusinessRiskService } from './business-risk.service';
import { BusinessStatusNotifierService } from './business-status-notifier.service';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

type TransactionManagerMock = {
  getRepository: (entity: unknown) => unknown;
};

type TransactionHandler = (manager: TransactionManagerMock) => Promise<unknown>;

describe('BusinessesService', () => {
  let service: BusinessesService;
  let businessRepo: jest.Mocked<Pick<Repository<Business>, 'findOne'>>;
  let dataSource: {
    transaction: jest.MockedFunction<
      (handler: TransactionHandler) => Promise<unknown>
    >;
  };
  let riskService: jest.Mocked<
    Pick<BusinessRiskService, 'refreshBusinessRiskScore'>
  >;
  let identifierValidationService: jest.Mocked<
    Pick<BusinessIdentifierValidationService, 'validate'>
  >;
  let notifier: jest.Mocked<
    Pick<BusinessStatusNotifierService, 'notifyStatusChanged'>
  >;

  beforeEach(() => {
    businessRepo = {
      findOne: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn() as jest.MockedFunction<(handler: TransactionHandler) => Promise<unknown>>,
    };
    riskService = {
      refreshBusinessRiskScore: jest.fn(),
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
      riskService as unknown as BusinessRiskService,
      identifierValidationService as unknown as BusinessIdentifierValidationService,
      notifier as unknown as BusinessStatusNotifierService,
    );
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
    identifierValidationService.validate.mockResolvedValue(true);
    dataSource.transaction.mockImplementation((handler) =>
      handler({
        getRepository: (entity: unknown) =>
          entity === Business
            ? transactionBusinessRepo
            : transactionStatusHistoryRepo,
      }),
    );
    jest.spyOn(service, 'findOne').mockResolvedValue(savedBusiness);

    await expect(service.create(dto, 'user-1')).resolves.toBe(savedBusiness);

    expect(identifierValidationService.validate).toHaveBeenCalledWith(
      dto.taxIdentifier,
      dto.country,
    );
    expect(transactionBusinessRepo.create).toHaveBeenCalledWith({
      ...dto,
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
    expect(riskService.refreshBusinessRiskScore).toHaveBeenCalledWith(
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

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('updates status inside a transaction and emits a structured notification', async () => {
    const currentBusiness = {
      id: 'business-1',
      name: 'Acme Corp',
      status: BusinessStatus.PENDING,
    } as Business;
    const updatedBusiness = {
      ...currentBusiness,
      status: BusinessStatus.APPROVED,
    } as Business;
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
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.APPROVED,
      reason: 'All checks passed',
      changedById: 'admin-1',
    });
    expect(notifier.notifyStatusChanged).toHaveBeenCalledWith({
      businessId: currentBusiness.id,
      businessName: currentBusiness.name,
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.APPROVED,
      changedById: 'admin-1',
    });
  });

  it('rejects repeated status updates', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'business-1',
      name: 'Acme Corp',
      status: BusinessStatus.PENDING,
    } as Business);

    await expect(
      service.updateStatus(
        'business-1',
        { status: BusinessStatus.PENDING },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(notifier.notifyStatusChanged).not.toHaveBeenCalled();
  });
});

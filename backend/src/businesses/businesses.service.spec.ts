import { BadRequestException, ConflictException } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Business } from "../common/entities";
import { BusinessStatus } from "../common/enums";
import { BusinessIdentifierValidationService } from "./business-identifier-validation.service";
import { BusinessRiskService } from "./business-risk.service";
import { BusinessStatusNotifierService } from "./business-status-notifier.service";
import { BusinessesService } from "./businesses.service";
import { CreateBusinessDto } from "./dto/create-business.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";

type TransactionManagerMock = {
  getRepository: (entity: unknown) => unknown;
};

type TransactionHandler = (manager: TransactionManagerMock) => Promise<unknown>;

describe("BusinessesService", () => {
  let service: BusinessesService;
  let businessRepo: jest.Mocked<Pick<Repository<Business>, "findOne" | "createQueryBuilder">>;
  let listQueryBuilder: {
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let dataSource: {
    transaction: jest.MockedFunction<(handler: TransactionHandler) => Promise<unknown>>;
    createQueryBuilder: jest.Mock;
  };
  let riskService: jest.Mocked<Pick<BusinessRiskService, "refreshBusinessRiskScore">>;
  let identifierValidationService: jest.Mocked<Pick<BusinessIdentifierValidationService, "validate">>;
  let notifier: jest.Mocked<Pick<BusinessStatusNotifierService, "notifyStatusChanged">>;

  beforeEach(() => {
    listQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };
    businessRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(listQueryBuilder),
    };
    dataSource = {
      transaction: jest.fn() as jest.MockedFunction<(handler: TransactionHandler) => Promise<unknown>>,
      createQueryBuilder: jest.fn(),
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

  it("creates a business, records initial history, and refreshes the risk score", async () => {
    const dto: CreateBusinessDto = {
      name: "Acme Corp",
      taxIdentifier: "20-12345678-9",
      country: "AR",
      industry: "technology",
    };
    const savedBusiness = {
      id: "business-1",
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
      country: "AR",
      format: "11 digits (for example 20-12345678-6)",
    });
    dataSource.transaction.mockImplementation((handler) =>
      handler({
        getRepository: (entity: unknown) =>
          entity === Business ? transactionBusinessRepo : transactionStatusHistoryRepo,
      }),
    );
    jest.spyOn(service, "findOne").mockResolvedValue(savedBusiness);

    await expect(service.create(dto, "user-1")).resolves.toBe(savedBusiness);

    expect(identifierValidationService.validate).toHaveBeenCalledWith(dto.taxIdentifier, dto.country);
    expect(transactionBusinessRepo.create).toHaveBeenCalledWith({
      ...dto,
      createdById: "user-1",
      identifierValidated: true,
      status: BusinessStatus.PENDING,
    });
    expect(transactionStatusHistoryRepo.save).toHaveBeenCalledWith({
      businessId: savedBusiness.id,
      previousStatus: null,
      newStatus: BusinessStatus.PENDING,
      reason: "Business created",
      changedById: "user-1",
    });
    expect(riskService.refreshBusinessRiskScore).toHaveBeenCalledWith(savedBusiness.id);
  });

  it("rejects duplicate tax identifiers before creating a business", async () => {
    businessRepo.findOne.mockResolvedValue({
      id: "existing-business",
    } as Business);

    await expect(
      service.create(
        {
          name: "Acme Corp",
          taxIdentifier: "20-12345678-9",
          country: "AR",
          industry: "technology",
        },
        "user-1",
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("rejects creation when the tax identifier is invalid for the country", async () => {
    const dto: CreateBusinessDto = {
      name: "Acme Corp",
      taxIdentifier: "invalid-id",
      country: "AR",
      industry: "technology",
    };

    businessRepo.findOne.mockResolvedValue(null);
    identifierValidationService.validate.mockResolvedValue({
      valid: false,
      country: "AR",
      format: "11 digits (for example 20-12345678-6)",
      failureReason: "invalid_format",
    });

    await expect(service.create(dto, "user-1")).rejects.toThrow(
      'Tax identifier "invalid-id" is not a valid Argentina tax ID. Expected format: 11 digits (for example 20-12345678-6).',
    );

    expect(identifierValidationService.validate).toHaveBeenCalledWith(dto.taxIdentifier, dto.country);
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(riskService.refreshBusinessRiskScore).not.toHaveBeenCalled();
  });

  it("explains when a tax identifier has the right format but fails the verification digit", async () => {
    const dto: CreateBusinessDto = {
      name: "Acme Corp",
      taxIdentifier: "30-42878049-2",
      country: "AR",
      industry: "technology",
    };

    businessRepo.findOne.mockResolvedValue(null);
    identifierValidationService.validate.mockResolvedValue({
      valid: false,
      country: "AR",
      format: "11 digits (for example 20-12345678-6)",
      failureReason: "invalid_checksum",
    });

    await expect(service.create(dto, "user-1")).rejects.toThrow(
      'Tax identifier "30-42878049-2" is not a valid Argentina tax ID. Expected format: 11 digits (for example 20-12345678-6).',
    );

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(riskService.refreshBusinessRiskScore).not.toHaveBeenCalled();
  });

  it("searches by company name, business id, and tax identifier", async () => {
    listQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    await expect(
      service.findAll({
        search: "20-12345678",
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

    expect(businessRepo.createQueryBuilder).toHaveBeenCalledWith("b");
    expect(listQueryBuilder.andWhere).toHaveBeenCalledWith(
      "(b.name ILIKE :search OR CAST(b.id AS text) ILIKE :search OR b.tax_identifier ILIKE :search OR REPLACE(REPLACE(REPLACE(b.tax_identifier, '-', ''), '.', ''), '/', '') ILIKE :normalizedSearch)",
      {
        search: "%20-12345678%",
        normalizedSearch: "%2012345678%",
      },
    );
  });

  it("updates status inside a transaction and emits a structured notification", async () => {
    const currentBusiness = {
      id: "business-1",
      name: "Acme Corp",
      status: BusinessStatus.PENDING,
    } as Business;
    const updatedBusiness = {
      ...currentBusiness,
      status: BusinessStatus.APPROVED,
    } as Business;
    const dto: UpdateStatusDto = {
      status: BusinessStatus.APPROVED,
      reason: "All checks passed",
    };

    const transactionBusinessRepo = {
      update: jest.fn().mockResolvedValue(undefined),
    };
    const transactionStatusHistoryRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    jest
      .spyOn(service, "findOne")
      .mockResolvedValueOnce(currentBusiness)
      .mockResolvedValueOnce(updatedBusiness);
    dataSource.transaction.mockImplementation((handler) =>
      handler({
        getRepository: (entity: unknown) =>
          entity === Business ? transactionBusinessRepo : transactionStatusHistoryRepo,
      }),
    );

    await expect(service.updateStatus(currentBusiness.id, dto, "admin-1")).resolves.toBe(updatedBusiness);

    expect(transactionBusinessRepo.update).toHaveBeenCalledWith(currentBusiness.id, {
      status: BusinessStatus.APPROVED,
    });
    expect(transactionStatusHistoryRepo.save).toHaveBeenCalledWith({
      businessId: currentBusiness.id,
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.APPROVED,
      reason: "All checks passed",
      changedById: "admin-1",
    });
    expect(notifier.notifyStatusChanged).toHaveBeenCalledWith({
      businessId: currentBusiness.id,
      businessName: currentBusiness.name,
      previousStatus: BusinessStatus.PENDING,
      newStatus: BusinessStatus.APPROVED,
      changedById: "admin-1",
    });
  });

  it("rejects repeated status updates", async () => {
    jest.spyOn(service, "findOne").mockResolvedValue({
      id: "business-1",
      name: "Acme Corp",
      status: BusinessStatus.PENDING,
    } as Business);

    await expect(
      service.updateStatus("business-1", { status: BusinessStatus.PENDING }, "admin-1"),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(notifier.notifyStatusChanged).not.toHaveBeenCalled();
  });

  it("getStats aggregates counts, average approval time, and compliance rate", async () => {
    const countQb = { getCount: jest.fn().mockResolvedValue(25) };
    const statusQb = {
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
      getRawOne: jest.fn().mockResolvedValue({ days: "3.24567" }),
    };

    businessRepo.createQueryBuilder.mockReturnValueOnce(countQb).mockReturnValueOnce(statusQb);
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

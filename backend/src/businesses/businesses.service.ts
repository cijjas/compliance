import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Business, StatusHistory } from '../common/entities';
import { BusinessStatus } from '../common/enums';
import {
  canTransitionBusinessStatus,
  getAllowedBusinessStatusTransitions,
  getBusinessStatusTransitionErrorMessage,
} from './business-status-policy';
import { BusinessIdentifierValidationService } from './validation/business-identifier-validation.service';
import { RiskAssessmentService } from '../risk-scoring';
import { BusinessStatusNotifierService } from './notifier/business-status-notifier.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { DeleteBusinessDto } from './dto/delete-business.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { PreviewRiskDto } from './dto/preview-risk.dto';
import {
  BusinessReferenceData,
  BusinessReferenceDataService,
} from './reference-data.service';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly dataSource: DataSource,
    private readonly businessReferenceDataService: BusinessReferenceDataService,
    private readonly riskAssessmentService: RiskAssessmentService,
    private readonly businessIdentifierValidationService: BusinessIdentifierValidationService,
    private readonly businessStatusNotifierService: BusinessStatusNotifierService,
  ) {}

  private buildDuplicateTaxIdentifierMessage(isArchived: boolean): string {
    return isArchived
      ? 'A business with this tax identifier already exists in archived records and cannot be recreated.'
      : 'Business with this tax identifier already exists';
  }

  private attachWorkflowMetadata<T extends Business>(
    business: T,
  ): T & { allowedNextStatuses: BusinessStatus[] } {
    return {
      ...business,
      allowedNextStatuses: [...getAllowedBusinessStatusTransitions(business.status)],
    };
  }

  private async findBusinessIncludingDeleted(id: string): Promise<Business> {
    const business = await this.businessRepo.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async checkTaxIdentifier(
    taxIdentifier: string,
    country: string,
  ): Promise<{ available: boolean; valid: boolean; message?: string }> {
    const countryPolicy =
      await this.businessReferenceDataService.assertActiveCountry(country);
    const existing = await this.businessRepo.findOne({
      where: { taxIdentifier: taxIdentifier.trim().toUpperCase() },
      withDeleted: true,
    });
    if (existing) {
      return {
        available: false,
        valid: true,
        message: this.buildDuplicateTaxIdentifierMessage(
          existing.deletedAt !== null,
        ),
      };
    }

    const validationResult =
      await this.businessIdentifierValidationService.validate(
        taxIdentifier,
        countryPolicy.code,
      );

    if (!validationResult.valid) {
      const expectedFormat = validationResult.format
        ? ` Expected format: ${validationResult.format}.`
        : '';
      return {
        available: false,
        valid: false,
        message: `Not a valid ${countryPolicy.name} tax ID.${expectedFormat}`,
      };
    }

    return { available: true, valid: true };
  }

  async create(dto: CreateBusinessDto, userId?: string): Promise<Business> {
    const { country, industry } =
      await this.businessReferenceDataService.assertSupportedBusinessProfile(
        dto.country,
        dto.industry,
      );
    const existingBusiness = await this.businessRepo.findOne({
      where: { taxIdentifier: dto.taxIdentifier },
      withDeleted: true,
    });
    if (existingBusiness) {
      throw new ConflictException(
        this.buildDuplicateTaxIdentifierMessage(
          existingBusiness.deletedAt !== null,
        ),
      );
    }

    const validationResult =
      await this.businessIdentifierValidationService.validate(
        dto.taxIdentifier,
        country.code,
      );

    if (!validationResult.valid) {
      const expectedFormat = validationResult.format
        ? ` Expected format: ${validationResult.format}.`
        : '';
      const message = `Tax identifier "${dto.taxIdentifier}" is not a valid ${country.name} tax ID.${expectedFormat}`;

      throw new BadRequestException(message);
    }

    const business = await this.dataSource.transaction(async (manager) => {
      const businessRepository = manager.getRepository(Business);
      const statusHistoryRepository = manager.getRepository(StatusHistory);

      const createdBusiness = businessRepository.create({
        ...dto,
        country: country.code,
        industry: industry.key,
        createdById: userId ?? null,
        identifierValidated: validationResult.valid,
        status: BusinessStatus.PENDING,
      });

      const savedBusiness = await businessRepository.save(createdBusiness);

      await statusHistoryRepository.save({
        businessId: savedBusiness.id,
        previousStatus: null,
        newStatus: BusinessStatus.PENDING,
        reason: 'Business created',
        changedById: userId ?? null,
      });

      return savedBusiness;
    });

    await this.riskAssessmentService.refreshBusinessRiskScore(business.id);
    return this.findOne(business.id);
  }

  async findAll(query: ListBusinessesDto) {
    const qb = this.businessRepo.createQueryBuilder('b');

    qb.andWhere('b.deleted_at IS NULL');

    if (query.status)
      qb.andWhere('b.status = :status', { status: query.status });
    if (query.country)
      qb.andWhere('b.country = :country', { country: query.country });
    if (query.industry)
      qb.andWhere('b.industry = :industry', { industry: query.industry });
    if (query.search) {
      const normalizedSearch = query.search.replace(/[^A-Za-z0-9]/g, '');

      qb.andWhere(
        "(b.name ILIKE :search OR CAST(b.id AS text) ILIKE :search OR b.tax_identifier ILIKE :search OR REPLACE(REPLACE(REPLACE(b.tax_identifier, '-', ''), '.', ''), '/', '') ILIKE :normalizedSearch)",
        {
          search: `%${query.search}%`,
          normalizedSearch: `%${normalizedSearch}%`,
        },
      );
    }

    const page = query.page;
    const limit = query.limit;

    const [data, total] = await qb
      .orderBy('b.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(
    id: string,
  ): Promise<Business & { allowedNextStatuses: BusinessStatus[] }> {
    const business = await this.businessRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.documents', 'doc')
      .leftJoinAndSelect('b.statusHistory', 'sh')
      .leftJoinAndSelect('sh.changedBy', 'shUser')
      .leftJoinAndSelect('b.createdBy', 'creator')
      .where('b.id = :id', { id })
      .andWhere('b.deleted_at IS NULL')
      .addOrderBy('sh.created_at', 'ASC')
      .addOrderBy('doc.created_at', 'DESC')
      .getOne();
    if (!business) throw new NotFoundException('Business not found');

    return this.attachWorkflowMetadata(business);
  }

  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    userId?: string,
  ): Promise<Business> {
    const business = await this.findOne(id);
    if (business.status === dto.status) {
      throw new BadRequestException('Business already has this status');
    }

    const previousStatus = business.status;
    if (!canTransitionBusinessStatus(previousStatus, dto.status)) {
      throw new BadRequestException(
        getBusinessStatusTransitionErrorMessage(previousStatus, dto.status),
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Business).update(id, {
        status: dto.status,
      });

      await manager.getRepository(StatusHistory).save({
        businessId: business.id,
        previousStatus,
        newStatus: dto.status,
        reason: dto.reason ?? null,
        changedById: userId ?? null,
      });
    });

    await this.businessStatusNotifierService.notifyStatusChanged({
      businessId: business.id,
      businessName: business.name,
      previousStatus,
      newStatus: dto.status,
      changedById: userId ?? null,
    });

    return this.findOne(id);
  }

  async remove(
    id: string,
    dto: DeleteBusinessDto,
    userId?: string,
  ): Promise<void> {
    const business = await this.findBusinessIncludingDeleted(id);

    if (business.deletedAt) {
      throw new BadRequestException('Business already deleted');
    }

    await this.dataSource.transaction(async (manager) => {
      const businessRepository = manager.getRepository(Business);

      await businessRepository.update(id, {
        deletionReason: dto.reason,
        deletedById: userId ?? null,
      });
      await businessRepository.softDelete(id);
    });
  }

  async getStats() {
    const qb = this.businessRepo.createQueryBuilder('b');
    qb.where('b.deleted_at IS NULL');

    const [total, byStatus, avgApprovalTime] = await Promise.all([
      qb.getCount(),

      this.businessRepo
        .createQueryBuilder('b')
        .where('b.deleted_at IS NULL')
        .select('b.status', 'status')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy('b.status')
        .getRawMany<{ status: BusinessStatus; count: number }>(),

      this.dataSource
        .createQueryBuilder()
        .select(
          'AVG(EXTRACT(EPOCH FROM (sh.created_at - b.created_at)) / 86400)',
          'days',
        )
        .from('status_history', 'sh')
        .innerJoin('businesses', 'b', 'b.id = sh.business_id')
        .where("sh.new_status = 'approved'")
        .andWhere('b.deleted_at IS NULL')
        .getRawOne<{ days: string | null }>(),
    ]);

    const statusCounts = Object.fromEntries(
      Object.values(BusinessStatus).map((s) => [s, 0]),
    ) as Record<BusinessStatus, number>;
    for (const row of byStatus) {
      statusCounts[row.status] = row.count;
    }

    const approved = statusCounts[BusinessStatus.APPROVED];
    const rejected = statusCounts[BusinessStatus.REJECTED];
    const resolved = approved + rejected;
    const complianceRate = resolved > 0 ? approved / resolved : null;

    return {
      total,
      byStatus: statusCounts,
      avgApprovalDays: avgApprovalTime?.days
        ? parseFloat(parseFloat(avgApprovalTime.days).toFixed(1))
        : null,
      complianceRate,
    };
  }

  async getRiskScore(id: string) {
    const assessment =
      await this.riskAssessmentService.refreshBusinessRiskScore(id);

    return {
      businessId: id,
      ...assessment,
    };
  }

  async previewRiskScore(dto: PreviewRiskDto) {
    const { country, industry } =
      await this.businessReferenceDataService.assertSupportedBusinessProfile(
        dto.country,
        dto.industry,
      );

    return this.riskAssessmentService.calculateAssessment({
      country: country.code,
      industry: industry.key,
      documentTypes: dto.documentTypes,
    });
  }

  getReferenceData(): Promise<BusinessReferenceData> {
    return this.businessReferenceDataService.getReferenceData();
  }
}

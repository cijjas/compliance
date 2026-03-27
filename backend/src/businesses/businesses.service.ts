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
import { BusinessIdentifierValidationService } from './business-identifier-validation.service';
import { BusinessRiskService } from './business-risk.service';
import { BusinessStatusNotifierService } from './business-status-notifier.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly dataSource: DataSource,
    private readonly businessRiskService: BusinessRiskService,
    private readonly businessIdentifierValidationService: BusinessIdentifierValidationService,
    private readonly businessStatusNotifierService: BusinessStatusNotifierService,
  ) {}

  async create(dto: CreateBusinessDto, userId?: string): Promise<Business> {
    const existingBusiness = await this.businessRepo.findOne({
      where: { taxIdentifier: dto.taxIdentifier },
    });
    if (existingBusiness) {
      throw new ConflictException(
        'Business with this tax identifier already exists',
      );
    }

    const identifierValidated =
      await this.businessIdentifierValidationService.validate(
        dto.taxIdentifier,
        dto.country,
      );

    const business = await this.dataSource.transaction(async (manager) => {
      const businessRepository = manager.getRepository(Business);
      const statusHistoryRepository = manager.getRepository(StatusHistory);

      const createdBusiness = businessRepository.create({
        ...dto,
        createdById: userId ?? null,
        identifierValidated,
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

    await this.businessRiskService.refreshBusinessRiskScore(business.id);
    return this.findOne(business.id);
  }

  async findAll(query: ListBusinessesDto) {
    const qb = this.businessRepo.createQueryBuilder('b');

    if (query.status)
      qb.andWhere('b.status = :status', { status: query.status });
    if (query.country)
      qb.andWhere('b.country = :country', { country: query.country });
    if (query.search)
      qb.andWhere('b.name ILIKE :search', { search: `%${query.search}%` });

    const page = query.page;
    const limit = query.limit;

    const [data, total] = await qb
      .orderBy('b.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Business> {
    const business = await this.businessRepo.findOne({
      where: { id },
      relations: [
        'documents',
        'statusHistory',
        'statusHistory.changedBy',
        'createdBy',
      ],
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
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

    this.businessStatusNotifierService.notifyStatusChanged({
      businessId: business.id,
      businessName: business.name,
      previousStatus,
      newStatus: dto.status,
      changedById: userId ?? null,
    });

    return this.findOne(id);
  }

  async getRiskScore(id: string) {
    const assessment =
      await this.businessRiskService.refreshBusinessRiskScore(id);

    return {
      businessId: id,
      ...assessment,
    };
  }
}

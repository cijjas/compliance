import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { RiskAssessmentService } from '../risk-scoring';
import { Document, Business } from '../common/entities';
import { DocumentType } from '../common/enums';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document) private documentRepo: Repository<Document>,
    @InjectRepository(Business) private businessRepo: Repository<Business>,
    private readonly dataSource: DataSource,
    private readonly riskAssessmentService: RiskAssessmentService,
  ) {}

  private async assertActiveBusinessExists(
    businessId: string,
  ): Promise<Business> {
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  private async computeChecksum(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  async upload(
    businessId: string,
    file: Express.Multer.File,
    type: DocumentType,
    userId?: string,
  ): Promise<Document> {
    const business = await this.assertActiveBusinessExists(businessId);
    const checksum = await this.computeChecksum(file.path);

    const savedDocument = await this.dataSource.transaction(async (manager) => {
      const docRepo = manager.getRepository(Document);

      const latest = await docRepo.findOne({
        where: { businessId, type },
        order: { version: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      const version = latest ? latest.version + 1 : 1;

      const doc = docRepo.create({
        businessId,
        type,
        fileName: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedById: userId ?? null,
        checksum,
        version,
      });

      return docRepo.save(doc);
    });

    await this.riskAssessmentService.refreshBusinessRiskScore(businessId);

    this.logger.log({
      event: 'document.uploaded',
      documentId: savedDocument.id,
      businessId,
      businessName: business.name,
      documentType: type,
      fileName: file.originalname,
      fileSize: file.size,
      checksum,
      version: savedDocument.version,
      uploadedById: userId ?? null,
    });

    return savedDocument;
  }

  async findByBusiness(businessId: string): Promise<Document[]> {
    await this.assertActiveBusinessExists(businessId);

    return this.documentRepo.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForBusiness(businessId: string, id: string): Promise<Document> {
    await this.assertActiveBusinessExists(businessId);

    const doc = await this.documentRepo.findOne({ where: { id, businessId } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }
}

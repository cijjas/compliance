import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessRiskService } from '../businesses/business-risk.service';
import { Document, Business } from '../common/entities';
import { DocumentType } from '../common/enums';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document) private documentRepo: Repository<Document>,
    @InjectRepository(Business) private businessRepo: Repository<Business>,
    private readonly businessRiskService: BusinessRiskService,
  ) {}

  async upload(
    businessId: string,
    file: Express.Multer.File,
    type: DocumentType,
  ): Promise<Document> {
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Business not found');

    const doc = this.documentRepo.create({
      businessId,
      type,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    const savedDocument = await this.documentRepo.save(doc);
    await this.businessRiskService.refreshBusinessRiskScore(businessId);

    return savedDocument;
  }

  async findByBusiness(businessId: string): Promise<Document[]> {
    return this.documentRepo.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }
}

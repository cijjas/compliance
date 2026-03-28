import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BusinessRiskService } from '../businesses/business-risk.service';
import { Business, Document } from '../common/entities';
import { DocumentType } from '../common/enums';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepo: jest.Mocked<Pick<Repository<Document>, 'create' | 'save' | 'findOne' | 'find'>>;
  let businessRepo: jest.Mocked<Pick<Repository<Business>, 'findOne'>>;
  let riskService: jest.Mocked<
    Pick<BusinessRiskService, 'refreshBusinessRiskScore'>
  >;

  beforeEach(() => {
    documentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    businessRepo = {
      findOne: jest.fn(),
    };
    riskService = {
      refreshBusinessRiskScore: jest.fn(),
    };

    service = new DocumentsService(
      documentRepo as unknown as Repository<Document>,
      businessRepo as unknown as Repository<Business>,
      riskService as unknown as BusinessRiskService,
    );
  });

  it('stores the document and refreshes the business risk score', async () => {
    const file = {
      originalname: 'fiscal-certificate.pdf',
      path: 'uploads/fiscal-certificate.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    } as Express.Multer.File;
    const createdDocument = {
      businessId: 'business-1',
      type: DocumentType.FISCAL_CERTIFICATE,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
    } as Document;
    const savedDocument = {
      ...createdDocument,
      id: 'document-1',
    } as Document;

    businessRepo.findOne.mockResolvedValue({ id: 'business-1' } as Business);
    documentRepo.create.mockReturnValue(createdDocument);
    documentRepo.save.mockResolvedValue(savedDocument);

    await expect(
      service.upload('business-1', file, DocumentType.FISCAL_CERTIFICATE),
    ).resolves.toBe(savedDocument);

    expect(documentRepo.create).toHaveBeenCalledWith({
      businessId: 'business-1',
      type: DocumentType.FISCAL_CERTIFICATE,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
    });
    expect(riskService.refreshBusinessRiskScore).toHaveBeenCalledWith(
      'business-1',
    );
  });

  it('fails fast when the business does not exist', async () => {
    businessRepo.findOne.mockResolvedValue(null);

    await expect(
      service.upload(
        'missing-business',
        {
          originalname: 'document.pdf',
          path: 'uploads/document.pdf',
          mimetype: 'application/pdf',
          size: 512,
        } as Express.Multer.File,
        DocumentType.FISCAL_CERTIFICATE,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(documentRepo.save).not.toHaveBeenCalled();
    expect(riskService.refreshBusinessRiskScore).not.toHaveBeenCalled();
  });

  it('findOne returns the document when it exists', async () => {
    const doc = {
      id: 'document-1',
      businessId: 'business-1',
      type: DocumentType.FISCAL_CERTIFICATE,
      fileName: 'fiscal-certificate.pdf',
      filePath: 'uploads/fiscal-certificate.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
    } as Document;
    documentRepo.findOne.mockResolvedValue(doc);

    await expect(service.findOne('document-1')).resolves.toBe(doc);
    expect(documentRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'document-1' },
    });
  });

  it('findOne throws NotFoundException when the document does not exist', async () => {
    documentRepo.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findByBusiness returns documents ordered by creation date', async () => {
    const docs = [
      { id: 'doc-2', businessId: 'business-1' },
      { id: 'doc-1', businessId: 'business-1' },
    ] as Document[];
    documentRepo.find.mockResolvedValue(docs);

    await expect(service.findByBusiness('business-1')).resolves.toBe(docs);
    expect(documentRepo.find).toHaveBeenCalledWith({
      where: { businessId: 'business-1' },
      order: { createdAt: 'DESC' },
    });
  });
});

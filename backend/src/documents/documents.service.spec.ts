import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BusinessRiskService } from '../businesses/business-risk.service';
import { Business, Document } from '../common/entities';
import { DocumentType } from '../common/enums';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepo: jest.Mocked<Pick<Repository<Document>, 'create' | 'save'>>;
  let businessRepo: jest.Mocked<Pick<Repository<Business>, 'findOne'>>;
  let riskService: jest.Mocked<
    Pick<BusinessRiskService, 'refreshBusinessRiskScore'>
  >;

  beforeEach(() => {
    documentRepo = {
      create: jest.fn(),
      save: jest.fn(),
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
      id: 'document-1',
      ...createdDocument,
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
});

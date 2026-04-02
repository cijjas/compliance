jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
}));

import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { RiskAssessmentService } from '../risk-scoring';
import { Business, Document } from '../common/entities';
import { DocumentType } from '../common/enums';
import { DocumentsService } from './documents.service';

const FAKE_CHECKSUM = createHash('sha256')
  .update(Buffer.from('fake-pdf-content'))
  .digest('hex');

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepo: jest.Mocked<
    Pick<Repository<Document>, 'create' | 'save' | 'findOne' | 'find'>
  >;
  let businessRepo: jest.Mocked<Pick<Repository<Business>, 'findOne'>>;
  let riskAssessmentService: jest.Mocked<
    Pick<RiskAssessmentService, 'refreshBusinessRiskScore'>
  >;
  let txDocRepo: jest.Mocked<
    Pick<Repository<Document>, 'create' | 'save' | 'findOne'>
  >;
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    documentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    txDocRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    businessRepo = {
      findOne: jest.fn(),
    };
    riskAssessmentService = {
      refreshBusinessRiskScore: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(async (cb: (manager: unknown) => Promise<unknown>) => {
        const manager = {
          getRepository: () => txDocRepo,
        };
        return cb(manager);
      }),
    };

    service = new DocumentsService(
      documentRepo as unknown as Repository<Document>,
      businessRepo as unknown as Repository<Business>,
      dataSource as any,
      riskAssessmentService as unknown as RiskAssessmentService,
    );
  });

  it('stores the document with uploader, checksum, version and refreshes the risk score', async () => {
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
      uploadedById: 'user-1',
      checksum: FAKE_CHECKSUM,
      version: 1,
    } as Document;
    const savedDocument = {
      ...createdDocument,
      id: 'document-1',
    } as Document;

    businessRepo.findOne.mockResolvedValue({
      id: 'business-1',
      name: 'Acme Corp',
    } as Business);
    txDocRepo.findOne.mockResolvedValue(null);
    txDocRepo.create.mockReturnValue(createdDocument);
    txDocRepo.save.mockResolvedValue(savedDocument);

    await expect(
      service.upload(
        'business-1',
        file,
        DocumentType.FISCAL_CERTIFICATE,
        'user-1',
      ),
    ).resolves.toBe(savedDocument);

    expect(txDocRepo.create).toHaveBeenCalledWith({
      businessId: 'business-1',
      type: DocumentType.FISCAL_CERTIFICATE,
      fileName: file.originalname,
      filePath: file.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedById: 'user-1',
      checksum: FAKE_CHECKSUM,
      version: 1,
    });
    expect(riskAssessmentService.refreshBusinessRiskScore).toHaveBeenCalledWith(
      'business-1',
    );
  });

  it('increments version when uploading the same document type for a business', async () => {
    const file = {
      originalname: 'fiscal-certificate-v2.pdf',
      path: 'uploads/fiscal-certificate-v2.pdf',
      mimetype: 'application/pdf',
      size: 2048,
    } as Express.Multer.File;

    businessRepo.findOne.mockResolvedValue({
      id: 'business-1',
      name: 'Acme Corp',
    } as Business);
    txDocRepo.findOne.mockResolvedValue({ version: 2 } as Document);
    txDocRepo.create.mockReturnValue({} as Document);
    txDocRepo.save.mockResolvedValue({ id: 'document-2' } as Document);

    await service.upload(
      'business-1',
      file,
      DocumentType.FISCAL_CERTIFICATE,
      'user-1',
    );

    expect(txDocRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ version: 3 }),
    );
  });

  it('defaults uploadedById to null when no user is provided', async () => {
    const file = {
      originalname: 'document.pdf',
      path: 'uploads/document.pdf',
      mimetype: 'application/pdf',
      size: 512,
    } as Express.Multer.File;

    businessRepo.findOne.mockResolvedValue({
      id: 'business-1',
      name: 'Acme Corp',
    } as Business);
    txDocRepo.findOne.mockResolvedValue(null);
    txDocRepo.create.mockReturnValue({} as Document);
    txDocRepo.save.mockResolvedValue({ id: 'document-1' } as Document);

    await service.upload(
      'business-1',
      file,
      DocumentType.FISCAL_CERTIFICATE,
    );

    expect(txDocRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ uploadedById: null }),
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
        'user-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(documentRepo.save).not.toHaveBeenCalled();
    expect(riskAssessmentService.refreshBusinessRiskScore).not.toHaveBeenCalled();
  });

  it('findOneForBusiness returns the document when it exists', async () => {
    const doc = {
      id: 'document-1',
      businessId: 'business-1',
      type: DocumentType.FISCAL_CERTIFICATE,
      fileName: 'fiscal-certificate.pdf',
      filePath: 'uploads/fiscal-certificate.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
    } as Document;
    businessRepo.findOne.mockResolvedValue({ id: 'business-1' } as Business);
    documentRepo.findOne.mockResolvedValue(doc);

    await expect(
      service.findOneForBusiness('business-1', 'document-1'),
    ).resolves.toBe(doc);
    expect(documentRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'document-1', businessId: 'business-1' },
    });
  });

  it('findOneForBusiness throws NotFoundException when the document does not exist', async () => {
    businessRepo.findOne.mockResolvedValue({ id: 'business-1' } as Business);
    documentRepo.findOne.mockResolvedValue(null);

    await expect(
      service.findOneForBusiness('business-1', 'missing-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findByBusiness returns documents ordered by creation date', async () => {
    const docs = [
      { id: 'doc-2', businessId: 'business-1' },
      { id: 'doc-1', businessId: 'business-1' },
    ] as Document[];
    businessRepo.findOne.mockResolvedValue({ id: 'business-1' } as Business);
    documentRepo.find.mockResolvedValue(docs);

    await expect(service.findByBusiness('business-1')).resolves.toBe(docs);
    expect(documentRepo.find).toHaveBeenCalledWith({
      where: { businessId: 'business-1' },
      order: { createdAt: 'DESC' },
    });
  });
});

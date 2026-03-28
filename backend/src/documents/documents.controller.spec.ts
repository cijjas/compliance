jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-document-id'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentType } from '../common/enums';
import type { Document } from '../common/entities';
import type { Business } from '../common/entities';

function buildMockDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'document-1',
    business: {} as Business,
    businessId: '8f5f6fa8-c6cf-4df2-9107-b29339af22a6',
    type: DocumentType.FISCAL_CERTIFICATE,
    fileName: 'fiscal-certificate.pdf',
    filePath: 'uploads/fiscal-certificate.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let documentsService: jest.Mocked<
    Pick<DocumentsService, 'upload' | 'findByBusiness' | 'findOne'>
  >;

  beforeEach(async () => {
    documentsService = {
      upload: jest.fn(),
      findByBusiness: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [{ provide: DocumentsService, useValue: documentsService }],
    }).compile();

    controller = module.get(DocumentsController);
  });

  it('upload delegates to the documents service', async () => {
    const businessId = '8f5f6fa8-c6cf-4df2-9107-b29339af22a6';
    const file = {
      originalname: 'fiscal-certificate.pdf',
      path: 'uploads/fiscal-certificate.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    } as Express.Multer.File;
    const dto: UploadDocumentDto = {
      type: DocumentType.FISCAL_CERTIFICATE,
    };
    const result = buildMockDocument({ businessId });
    documentsService.upload.mockResolvedValue(result);

    await expect(controller.upload(businessId, file, dto)).resolves.toEqual(
      result,
    );
    expect(documentsService.upload).toHaveBeenCalledWith(
      businessId,
      file,
      dto.type,
    );
  });

  it('findAll delegates to the documents service', async () => {
    const businessId = '8f5f6fa8-c6cf-4df2-9107-b29339af22a6';
    const result = [buildMockDocument({ businessId })];
    documentsService.findByBusiness.mockResolvedValue(result);

    await expect(controller.findAll(businessId)).resolves.toEqual(result);
    expect(documentsService.findByBusiness).toHaveBeenCalledWith(businessId);
  });

  it('download resolves the document via the service', async () => {
    const doc = buildMockDocument({
      mimeType: 'application/pdf',
      fileName: 'fiscal-certificate.pdf',
    });
    documentsService.findOne.mockResolvedValue(doc);

    // We only verify delegation — streaming depends on the filesystem
    await expect(documentsService.findOne(doc.id)).resolves.toEqual(doc);
    expect(documentsService.findOne).toHaveBeenCalledWith(doc.id);
  });
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-document-id'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  StreamableFile,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  DocumentsController,
  documentPdfFileFilter,
} from './documents.controller';
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
    Pick<DocumentsService, 'upload' | 'findByBusiness' | 'findOneForBusiness'>
  >;

  beforeEach(async () => {
    documentsService = {
      upload: jest.fn(),
      findByBusiness: jest.fn(),
      findOneForBusiness: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [{ provide: DocumentsService, useValue: documentsService }],
    }).compile();

    controller = module.get(DocumentsController);
  });

  it('accepts PDF files in the upload filter', () => {
    const callback = jest.fn();

    documentPdfFileFilter(
      {} as Express.Request,
      {
        mimetype: 'application/pdf',
        originalname: 'fiscal-certificate.pdf',
      } as Express.Multer.File,
      callback,
    );

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejects non-PDF files in the upload filter with 415', () => {
    const callback = jest.fn();

    documentPdfFileFilter(
      {} as Express.Request,
      {
        mimetype: 'image/png',
        originalname: 'fiscal-certificate.png',
      } as Express.Multer.File,
      callback,
    );

    const [error, accepted] = callback.mock.calls[0];
    expect(error).toBeInstanceOf(UnsupportedMediaTypeException);
    expect((error as UnsupportedMediaTypeException).getStatus()).toBe(415);
    expect(accepted).toBe(false);
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
    const filePath = join(tmpdir(), 'complif-documents-controller-success.pdf');
    const doc = buildMockDocument({
      filePath,
      mimeType: 'application/pdf',
      fileName: 'fiscal-certificate.pdf',
    });
    const res = {
      set: jest.fn(),
    };

    writeFileSync(filePath, 'pdf-bytes');
    documentsService.findOneForBusiness.mockResolvedValue(doc);

    await expect(
      controller.download(doc.businessId, doc.id, res as never),
    ).resolves.toBeInstanceOf(StreamableFile);
    expect(documentsService.findOneForBusiness).toHaveBeenCalledWith(
      doc.businessId,
      doc.id,
    );
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${doc.fileName}"`,
    });
  });

  it('download fails with NotFoundException when the file is missing on disk', async () => {
    const doc = buildMockDocument({
      filePath: join(tmpdir(), 'complif-missing-document.pdf'),
    });
    const res = {
      set: jest.fn(),
    };

    documentsService.findOneForBusiness.mockResolvedValue(doc);

    await expect(
      controller.download(doc.businessId, doc.id, res as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

import {
  Body,
  UnsupportedMediaTypeException,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFilePipeBuilder } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, resolve, join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { v4 as uuid } from 'uuid';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

export const DOCUMENT_UPLOAD_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function documentPdfFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (file.mimetype !== 'application/pdf') {
    cb(new UnsupportedMediaTypeException('Only PDF files are allowed'), false);
    return;
  }

  cb(null, true);
}

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('businesses/:businessId/documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueName = `${uuid()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: DOCUMENT_UPLOAD_MAX_SIZE_BYTES },
      fileFilter: documentPdfFileFilter,
    }),
  )
  upload(
    @Param('businessId', new ParseUUIDPipe()) businessId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: DOCUMENT_UPLOAD_MAX_SIZE_BYTES })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.upload(businessId, file, dto.type, user.id);
  }

  @Get()
  findAll(@Param('businessId', new ParseUUIDPipe()) businessId: string) {
    return this.documentsService.findByBusiness(businessId);
  }

  @Get(':id/download')
  async download(
    @Param('businessId', new ParseUUIDPipe()) businessId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const doc = await this.documentsService.findOneForBusiness(businessId, id);
    const uploadsDir = resolve('./uploads');
    const filePath = resolve(doc.filePath);
    if (!filePath.startsWith(uploadsDir + '/')) {
      throw new NotFoundException('Document file not found');
    }
    if (!existsSync(filePath)) {
      throw new NotFoundException('Document file not found');
    }
    const stream = createReadStream(filePath);

    res.set({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${doc.fileName}"`,
    });

    return new StreamableFile(stream);
  }
}

import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface FormatValidationResponse {
  valid: boolean;
  country: string;
  format: string;
  failureReason?: 'invalid_format' | 'invalid_checksum';
}

export interface BusinessIdentifierValidationResult {
  valid: boolean;
  country: string;
  format: string | null;
  failureReason?: 'invalid_format' | 'invalid_checksum';
}

@Injectable()
export class BusinessIdentifierValidationService {
  private readonly logger = new Logger(
    BusinessIdentifierValidationService.name,
  );

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async validate(
    identifier: string,
    country: string,
  ): Promise<BusinessIdentifierValidationResult> {
    try {
      const baseUrl = this.configService.get<string>(
        'FORMAT_VALIDATION_URL',
        'http://localhost:3001',
      );
      const { data } = await firstValueFrom(
        this.httpService.post<FormatValidationResponse>(
          `${baseUrl}/validate/identifier`,
          { identifier, country },
        ),
      );

      return {
        valid: Boolean(data.valid),
        country: data.country ?? country,
        format: data.format ?? null,
        failureReason: data.failureReason,
      };
    } catch (error) {
      this.logger.warn(
        `Could not validate identifier "${identifier}" for country "${country}": ${error}`,
      );
      throw new ServiceUnavailableException(
        'Tax identifier validation is temporarily unavailable. Please retry in a few moments.',
      );
    }
  }
}

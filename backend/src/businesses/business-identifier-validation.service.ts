import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface FormatValidationResponse {
  valid: boolean;
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

  async validate(identifier: string, country: string): Promise<boolean> {
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

      return Boolean(data.valid);
    } catch (error) {
      this.logger.warn(
        `Could not validate identifier "${identifier}" for country "${country}": ${error}`,
      );
      return false;
    }
  }
}

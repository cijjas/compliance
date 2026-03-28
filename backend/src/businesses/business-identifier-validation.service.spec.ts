import { of, throwError } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { BusinessIdentifierValidationService } from './business-identifier-validation.service';

describe('BusinessIdentifierValidationService', () => {
  let service: BusinessIdentifierValidationService;
  let httpService: { post: jest.Mock };
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(() => {
    httpService = { post: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('http://localhost:3001') };

    service = new BusinessIdentifierValidationService(
      httpService as any,
      configService as unknown as ConfigService,
    );
  });

  it('returns a successful validation result from the microservice', async () => {
    const response = {
      data: {
        valid: true,
        country: 'AR',
        format: '11 digits (for example 20-12345678-6)',
      },
    };
    httpService.post.mockReturnValue(of(response));

    const result = await service.validate('20-12345678-9', 'AR');

    expect(result).toEqual({
      valid: true,
      country: 'AR',
      format: '11 digits (for example 20-12345678-6)',
      failureReason: undefined,
    });
    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/validate/identifier',
      { identifier: '20-12345678-9', country: 'AR' },
    );
  });

  it('returns the failure reason when the identifier is invalid', async () => {
    const response = {
      data: {
        valid: false,
        country: 'AR',
        format: '11 digits (for example 20-12345678-6)',
        failureReason: 'invalid_checksum' as const,
      },
    };
    httpService.post.mockReturnValue(of(response));

    const result = await service.validate('20-12345678-0', 'AR');

    expect(result).toEqual({
      valid: false,
      country: 'AR',
      format: '11 digits (for example 20-12345678-6)',
      failureReason: 'invalid_checksum',
    });
  });

  it('gracefully degrades when the microservice is unavailable', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new Error('ECONNREFUSED')),
    );

    const result = await service.validate('20-12345678-9', 'AR');

    expect(result).toEqual({
      valid: false,
      country: 'AR',
      format: null,
      failureReason: undefined,
    });
  });

  it('defaults country and format from the microservice response', async () => {
    const response = {
      data: {
        valid: true,
        country: undefined,
        format: undefined,
      },
    };
    httpService.post.mockReturnValue(of(response));

    const result = await service.validate('ABC060101AAA', 'MX');

    expect(result.country).toBe('MX');
    expect(result.format).toBeNull();
  });
});

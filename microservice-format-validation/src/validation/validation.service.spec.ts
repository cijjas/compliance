import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
  });

  it('accepts a valid CUIT for Argentina', () => {
    const result = service.validateIdentifier({
      identifier: '20-12345678-6',
      country: 'AR',
    });

    expect(result.valid).toBe(true);
    expect(result.format).toBe('11 digits (for example 20-12345678-6)');
  });

  it('rejects an Argentina CUIT that has the right shape but the wrong check digit', () => {
    const result = service.validateIdentifier({
      identifier: '30-42878049-2',
      country: 'AR',
    });

    expect(result.valid).toBe(false);
    expect(result.format).toBe('11 digits (for example 20-12345678-6)');
    expect(result.failureReason).toBe('invalid_checksum');
  });

  it('rejects an invalid RFC for Mexico', () => {
    const result = service.validateIdentifier({
      identifier: 'INVALID-RFC',
      country: 'MX',
    });

    expect(result.valid).toBe(false);
    expect(result.format).toBe('RFC (XXX000000XXX)');
  });

  it('uses the generic fallback for unsupported countries', () => {
    const result = service.validateIdentifier({
      identifier: 'ABCD1234',
      country: 'US',
    });

    expect(result.valid).toBe(true);
    expect(result.format).toBe('generic');
  });
});

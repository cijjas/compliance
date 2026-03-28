import { Injectable } from '@nestjs/common';
import { ValidateIdentifierDto } from './dto/validate-identifier.dto';

@Injectable()
export class ValidationService {
  private static readonly AR_FORMAT_EXAMPLE =
    '11 digits (for example 20-12345678-6)';

  validateIdentifier(dto: ValidateIdentifierDto) {
    const { identifier, country } = dto;

    type ValidationResult = {
      valid: boolean;
      format: string;
      failureReason?: 'invalid_format' | 'invalid_checksum';
    };

    const validators: Record<
      string,
      (id: string) => ValidationResult
    > = {
      AR: (id) => this.validateCUIT(id),
      MX: (id) => this.validateRFC(id),
      BR: (id) => this.validateCNPJ(id),
      DEFAULT: (id) => ({ valid: id.length >= 5, format: 'generic' }),
    };

    const validator = validators[country] || validators['DEFAULT'];
    const result = validator(identifier);

    return {
      identifier,
      country,
      ...result,
      validatedAt: new Date().toISOString(),
    };
  }

  private validateCUIT(cuit: string): {
    valid: boolean;
    format: string;
    failureReason?: 'invalid_format' | 'invalid_checksum';
  } {
    // CUIT format: XX-XXXXXXXX-X (11 digits)
    const cleaned = cuit.replace(/-/g, '');
    if (cleaned.length !== 11 || !/^\d+$/.test(cleaned)) {
      return {
        valid: false,
        format: ValidationService.AR_FORMAT_EXAMPLE,
        failureReason: 'invalid_format',
      };
    }

    // Validate check digit
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const digits = cleaned.split('').map(Number);
    const sum = multipliers.reduce((acc, mult, i) => acc + mult * digits[i], 0);
    const remainder = sum % 11;
    const checkDigit =
      remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

    if (checkDigit !== digits[10]) {
      return {
        valid: false,
        format: ValidationService.AR_FORMAT_EXAMPLE,
        failureReason: 'invalid_checksum',
      };
    }

    return { valid: true, format: ValidationService.AR_FORMAT_EXAMPLE };
  }

  private validateRFC(rfc: string): {
    valid: boolean;
    format: string;
    failureReason?: 'invalid_format';
  } {
    // RFC format for companies: 3 letters + 6 digits + 3 alphanumeric
    const rfcRegex = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
    return {
      valid: rfcRegex.test(rfc.toUpperCase()),
      format: 'RFC (XXX000000XXX)',
      failureReason: rfcRegex.test(rfc.toUpperCase())
        ? undefined
        : 'invalid_format',
    };
  }

  private validateCNPJ(cnpj: string): {
    valid: boolean;
    format: string;
    failureReason?: 'invalid_format';
  } {
    // CNPJ format: XX.XXX.XXX/XXXX-XX (14 digits)
    const cleaned = cnpj.replace(/[.\-/]/g, '');
    return {
      valid: cleaned.length === 14 && /^\d+$/.test(cleaned),
      format: 'CNPJ (XX.XXX.XXX/XXXX-XX)',
      failureReason:
        cleaned.length === 14 && /^\d+$/.test(cleaned)
          ? undefined
          : 'invalid_format',
    };
  }
}

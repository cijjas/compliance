import { Injectable } from '@nestjs/common';
import { ValidateIdentifierDto } from './dto/validate-identifier.dto';

@Injectable()
export class ValidationService {
  validateIdentifier(dto: ValidateIdentifierDto) {
    const { identifier, country } = dto;

    const validators: Record<
      string,
      (id: string) => { valid: boolean; format: string }
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

  private validateCUIT(cuit: string): { valid: boolean; format: string } {
    // CUIT format: XX-XXXXXXXX-X (11 digits)
    const cleaned = cuit.replace(/-/g, '');
    if (cleaned.length !== 11 || !/^\d+$/.test(cleaned)) {
      return { valid: false, format: 'CUIT (XX-XXXXXXXX-X)' };
    }

    // Validate check digit
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const digits = cleaned.split('').map(Number);
    const sum = multipliers.reduce((acc, mult, i) => acc + mult * digits[i], 0);
    const remainder = sum % 11;
    const checkDigit =
      remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

    return {
      valid: checkDigit === digits[10],
      format: 'CUIT (XX-XXXXXXXX-X)',
    };
  }

  private validateRFC(rfc: string): { valid: boolean; format: string } {
    // RFC format for companies: 3 letters + 6 digits + 3 alphanumeric
    const rfcRegex = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
    return {
      valid: rfcRegex.test(rfc.toUpperCase()),
      format: 'RFC (XXX000000XXX)',
    };
  }

  private validateCNPJ(cnpj: string): { valid: boolean; format: string } {
    // CNPJ format: XX.XXX.XXX/XXXX-XX (14 digits)
    const cleaned = cnpj.replace(/[.\-/]/g, '');
    return {
      valid: cleaned.length === 14 && /^\d+$/.test(cleaned),
      format: 'CNPJ (XX.XXX.XXX/XXXX-XX)',
    };
  }
}

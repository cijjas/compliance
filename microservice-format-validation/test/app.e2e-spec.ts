import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationController } from '../src/validation/validation.controller';
import { ValidationService } from '../src/validation/validation.service';
import { ValidateIdentifierDto } from '../src/validation/dto/validate-identifier.dto';

describe('Validation microservice (e2e)', () => {
  let controller: ValidationController;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ValidationController],
      providers: [ValidationService],
    }).compile();

    controller = moduleFixture.get(ValidationController);
  });

  it('returns the health payload', () => {
    expect(controller.health()).toEqual({
      status: 'ok',
      service: 'format-validation',
    });
  });

  it('validates identifiers by country after DTO validation', async () => {
    const dto = plainToInstance(ValidateIdentifierDto, {
      identifier: '20-12345678-6',
      country: 'AR',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    const result = controller.validateIdentifier(dto);

    expect(result).toEqual(
      expect.objectContaining({
        identifier: '20-12345678-6',
        country: 'AR',
        valid: true,
        format: '11 digits (for example 20-12345678-6)',
      }),
    );
    expect(result.validatedAt).toEqual(expect.stringMatching(/.*/));
  });
});

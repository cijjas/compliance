import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ValidationService } from './validation.service';
import { ValidateIdentifierDto } from './dto/validate-identifier.dto';

@ApiTags('Validation')
@Controller('validate')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'ok', service: 'format-validation' };
  }

  @Post('identifier')
  @ApiOperation({ summary: 'Validate a company tax ID by country' })
  validateIdentifier(@Body() dto: ValidateIdentifierDto) {
    return this.validationService.validateIdentifier(dto);
  }
}

import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateIdentifierDto {
  @ApiProperty({ example: '20-12345678-9', description: 'Fiscal identifier (CUIT, RFC, CNPJ, etc.)' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  identifier!: string;

  @ApiProperty({ example: 'AR', description: 'ISO 3166-1 alpha-2 country code' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  country!: string;
}

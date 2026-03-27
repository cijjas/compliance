import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateBusinessDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.businessesService.create(dto, user.id);
  }

  @Get()
  findAll(@Query() query: ListBusinessesDto) {
    return this.businessesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.businessesService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.businessesService.updateStatus(id, dto, user.id);
  }

  @Get(':id/risk-score')
  getRiskScore(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.businessesService.getRiskScore(id);
  }
}

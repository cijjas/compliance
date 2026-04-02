import { Controller, Get, Param, Patch, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

interface MessageEvent {
  data: string | object;
}

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  stream(): Observable<MessageEvent> {
    return this.notificationsService.getStatusChanges$().pipe(
      map((event) => ({
        data: event,
      })),
    );
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.notificationsService.findAll();
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }

  @Patch('read-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markAllRead() {
    return this.notificationsService.markAllRead();
  }
}

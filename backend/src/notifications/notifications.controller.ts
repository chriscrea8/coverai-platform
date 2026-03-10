import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators';

@ApiTags('Notifications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications (in_app by default, ?type=all for all)' })
  getAll(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.svc.getForUser(userId, limit ? Number(limit) : 50, type === 'all' ? undefined : 'in_app');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async unreadCount(@CurrentUser('id') userId: string) {
    const count = await this.svc.countUnread(userId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.markRead(id, userId);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.svc.markAllRead(userId);
  }
}

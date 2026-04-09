import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { InviteDto } from './dto/invite.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SessionOwnerGuard } from '../common/guards/session-owner.guard';
import { User } from '../database/entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MailService } from '../mail/mail.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly mailService: MailService,
  ) {}

  @Post()
  create(@Body() dto: CreateSessionDto, @Req() req: Request) {
    return this.sessionsService.create(dto, req.user as User);
  }

  @Get()
  findAll() {
    return this.sessionsService.findAllOpen();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sessionsService.findById(id);
  }

  @Post(':id/join')
  async join(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const session = await this.sessionsService.join(id, req.user as User);
    return session;
  }

  @Post(':id/invite')
  @UseGuards(SessionOwnerGuard)
  async invite(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: InviteDto,
    @Req() req: Request,
  ) {
    const session = await this.sessionsService.findById(id);
    const inviter = req.user as User;

    // Send all emails
    const results = await Promise.allSettled(
      dto.emails.map((email) =>
        this.mailService.sendInvite({
          to: email,
          sessionTitle: session.title,
          sessionId: session.id,
          inviterName: inviter.name,
        }),
      ),
    );

    const sent: string[] = [];
    const failed: string[] = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        sent.push(dto.emails[i]);
      } else {
        failed.push(dto.emails[i]);
      }
    });

    return { sent, failed };
  }

  @Post(':id/end')
  @UseGuards(SessionOwnerGuard)
  async end(@Param('id', ParseIntPipe) id: number) {
    const session = await this.sessionsService.end(id);
    this.realtimeGateway.broadcastSessionEnded(session);
    return session;
  }
}

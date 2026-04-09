import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { Session } from '../database/entities/session.entity';
import { SessionMember } from '../database/entities/session-member.entity';
import { Restaurant } from '../database/entities/restaurant.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, SessionMember, Restaurant]),
    RealtimeModule,
    MailModule,
  ],
  providers: [SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}
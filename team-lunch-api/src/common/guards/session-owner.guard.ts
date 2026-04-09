import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionStatus } from '../../database/entities/session.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class SessionOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    const sessionId = parseInt(request.params.id, 10);

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) return true;

    if (session.status === SessionStatus.ENDED) {
      throw new ForbiddenException('Session has already ended');
    }

    if (session.ownerId !== user.id) {
      throw new ForbiddenException('Only the session owner can perform this action');
    }

    return true;
  }
}

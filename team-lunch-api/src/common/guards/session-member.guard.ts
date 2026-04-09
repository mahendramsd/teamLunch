import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionMember } from '../../database/entities/session-member.entity';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class SessionMemberGuard implements CanActivate {
  constructor(
    @InjectRepository(SessionMember)
    private readonly memberRepository: Repository<SessionMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    const sessionId = parseInt(request.params.id, 10);

    const membership = await this.memberRepository.findOne({
      where: { sessionId, userId: user.id },
    });

    if (!membership) {
      throw new ForbiddenException('You must join the session before submitting a restaurant');
    }

    return true;
  }
}

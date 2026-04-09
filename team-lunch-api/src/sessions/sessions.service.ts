import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionStatus } from '../database/entities/session.entity';
import { SessionMember } from '../database/entities/session-member.entity';
import { Restaurant } from '../database/entities/restaurant.entity';
import { User } from '../database/entities/user.entity';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(SessionMember)
    private readonly memberRepository: Repository<SessionMember>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  ) {}

  async create(dto: CreateSessionDto, owner: User): Promise<Session> {
    const session = this.sessionRepository.create({
      title: dto.title.trim(),
      status: SessionStatus.OPEN,
      ownerId: owner.id,
    });
    const saved = await this.sessionRepository.save(session);

    // Owner automatically joins their own session
    await this.memberRepository.save(
      this.memberRepository.create({ sessionId: saved.id, userId: owner.id }),
    );

    return this.findById(saved.id);
  }

  async findAllOpen(): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { status: SessionStatus.OPEN },
      relations: ['owner', 'members', 'members.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: [
        'owner',
        'members',
        'members.user',
        'restaurants',
        'restaurants.submittedBy',
        'pickedRestaurant',
      ],
    });
    if (!session) throw new NotFoundException(`Session #${id} not found`);
    return session;
  }

  async join(sessionId: number, user: User): Promise<Session> {
    const session = await this.findById(sessionId);

    if (session.status === SessionStatus.ENDED) {
      throw new BadRequestException(
        'Cannot join a session that has already ended',
      );
    }

    const existing = await this.memberRepository.findOne({
      where: { sessionId, userId: user.id },
    });

    if (!existing) {
      await this.memberRepository.save(
        this.memberRepository.create({ sessionId, userId: user.id }),
      );
    }

    return this.findById(sessionId);
  }

  async end(
    sessionId: number,
    pickFn: (items: Restaurant[]) => Restaurant = this.randomPick,
  ): Promise<Session> {
    const session = await this.findById(sessionId);

    if (session.status === SessionStatus.ENDED) {
      throw new ConflictException('Session has already ended');
    }

    const restaurants = await this.restaurantRepository.find({
      where: { sessionId },
    });

    if (restaurants.length === 0) {
      throw new BadRequestException(
        'Cannot end a session with no restaurant submissions',
      );
    }

    const picked = pickFn(restaurants);

    session.status = SessionStatus.ENDED;
    session.pickedRestaurantId = picked.id;
    session.endedAt = new Date();
    await this.sessionRepository.save(session);

    return this.findById(sessionId);
  }

  private randomPick(restaurants: Restaurant[]): Restaurant {
    return restaurants[Math.floor(Math.random() * restaurants.length)];
  }
}

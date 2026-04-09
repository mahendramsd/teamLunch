import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../database/entities/restaurant.entity';
import { Session, SessionStatus } from '../database/entities/session.entity';
import { User } from '../database/entities/user.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async submit(
    sessionId: number,
    dto: CreateRestaurantDto,
    user: User,
  ): Promise<Restaurant> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException(`Session #${sessionId} not found`);

    if (session.status === SessionStatus.ENDED) {
      throw new BadRequestException('Cannot submit to an ended session');
    }

    const restaurant = this.restaurantRepository.create({
      name: dto.name.trim(),
      sessionId,
      submittedById: user.id,
    });

    const saved = await this.restaurantRepository.save(restaurant);
    return this.restaurantRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ['submittedBy'],
    });
  }

  async findBySession(sessionId: number): Promise<Restaurant[]> {
    return this.restaurantRepository.find({
      where: { sessionId },
      relations: ['submittedBy'],
      order: { createdAt: 'ASC' },
    });
  }
}

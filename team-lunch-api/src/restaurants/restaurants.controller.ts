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
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SessionMemberGuard } from '../common/guards/session-member.guard';
import { User } from '../database/entities/user.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller('sessions/:id/restaurants')
@UseGuards(JwtAuthGuard)
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Post()
  @UseGuards(SessionMemberGuard)
  async submit(
    @Param('id', ParseIntPipe) sessionId: number,
    @Body() dto: CreateRestaurantDto,
    @Req() req: Request,
  ) {
    const restaurant = await this.restaurantsService.submit(
      sessionId,
      dto,
      req.user as User,
    );
    this.realtimeGateway.broadcastRestaurantAdded(sessionId, restaurant);
    return restaurant;
  }

  @Get()
  @UseGuards(SessionMemberGuard)
  findAll(@Param('id', ParseIntPipe) sessionId: number) {
    return this.restaurantsService.findBySession(sessionId);
  }
}

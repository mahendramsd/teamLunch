import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../database/entities/user.entity';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async findOrCreateUser(profile: GoogleProfile): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = this.userRepository.create(profile);
      await this.userRepository.save(user);
    } else {
      // Keep name and avatar in sync
      user.name = profile.name;
      user.avatarUrl = profile.avatarUrl ?? '';
      await this.userRepository.save(user);
    }

    return user;
  }

  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_EXPIRES_IN',
        '15m',
      ) as `${number}m`,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ) as `${number}d`,
    });

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): { sub: number; email: string } {
    return this.jwtService.verify(token);
  }

  async findUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}

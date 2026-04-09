import {
  Controller,
  Get,
  Post,
  Delete,
  Req,
  Res,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../database/entities/user.entity';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(@Query('redirect') redirect?: string): void {
    void redirect;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('state') state?: string,
  ): void {
    const user = req.user as User;
    const { accessToken, refreshToken } = this.authService.generateTokens(user);
    let redirectTo = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/sessions`;
    if (state) {
      try {
        const decoded = decodeURIComponent(state);
        const frontendBase =
          process.env.FRONTEND_URL ?? 'http://localhost:3000';
        if (decoded.startsWith(frontendBase) || decoded.startsWith('/')) {
          redirectTo = decoded;
        }
      } catch {
        console.log('');
      }
    }

    res
      .cookie('access_token', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      })
      .cookie('refresh_token', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .redirect(redirectTo);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const token: string | undefined = req.cookies?.['refresh_token'];
    if (!token) throw new UnauthorizedException('No refresh token');

    const payload = this.authService.verifyToken(token);
    const user = await this.authService.findUserById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    const { accessToken, refreshToken } = this.authService.generateTokens(user);

    res
      .cookie('access_token', accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 15 * 60 * 1000,
      })
      .cookie('refresh_token', refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: 'Token refreshed' });
  }

  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Res() res: Response): void {
    res
      .clearCookie('access_token')
      .clearCookie('refresh_token')
      .json({ message: 'Logged out' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request) {
    return req.user;
  }
}

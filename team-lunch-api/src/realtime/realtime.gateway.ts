import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Restaurant } from '../database/entities/restaurant.entity';
import { Session } from '../database/entities/session.entity';

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

@WebSocketGateway({
  cors: {
    origin: frontendUrl,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      let token: string | undefined = client.handshake.auth?.token;
      
      // Fallback to reading the token from cookies since the frontend uses httpOnly cookies
      if (!token && client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'access_token') {
            token = value;
            break;
          }
        }
      }

      if (!token) throw new Error('No token provided');

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret }) as {
        sub: number;
      };

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });
      if (!user) throw new Error('User not found');

      (client.data as { user: typeof user }).user = user;
      this.logger.log(`Client connected: ${client.id} (User: ${user.id})`);
    } catch (error) {
      this.logger.error(
        `Connection failed: ${(error as Error).message} - ${client.id}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('session:join')
  handleJoinSession(
    @MessageBody() data: { sessionId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `session:${data.sessionId}`;
    void client.join(room);
    this.logger.log(`Client ${client.id} joined room -> ${room}`);
    return { event: 'session:joined', data: { room } };
  }

  broadcastRestaurantAdded(sessionId: number, restaurant: Restaurant) {
    this.server.to(`session:${sessionId}`).emit('restaurant:added', restaurant);
  }

  broadcastSessionEnded(session: Session) {
    this.server
      .to(`session:${session.id}`)
      .emit('session:ended', { pickedRestaurant: session.pickedRestaurant });
  }
}

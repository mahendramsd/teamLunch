import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { User } from '../src/database/entities/user.entity';
import { SessionStatus } from '../src/database/entities/session.entity';

describe('SessionsController (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let ownerTokens: { accessToken: string; refreshToken: string };
  let memberTokens: { accessToken: string; refreshToken: string };
  let owner: User;
  let member: User;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.DB_HOST = '127.0.0.1';
    process.env.DB_PORT = '3307';
    process.env.DB_USER = 'user';
    process.env.DB_PASSWORD = '123456';
    process.env.DB_NAME = 'team_lunch';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);

    // Setup Test Users
    owner = await authService.findOrCreateUser({
      googleId: 'google-1',
      email: 'owner@test.com',
      name: 'Owner',
    });
    ownerTokens = authService.generateTokens(owner);

    member = await authService.findOrCreateUser({
      googleId: 'google-2',
      email: 'member@test.com',
      name: 'Member',
    });
    memberTokens = authService.generateTokens(member);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Session Lifecycle', () => {
    let sessionId: number;

    it('should create a session as owner', async () => {
      const response = await request(app.getHttpServer())
        .post('/sessions')
        .set('Cookie', [`access_token=${ownerTokens.accessToken}`])
        .send({ title: 'Friday Lunch' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Friday Lunch');
      expect(response.body.ownerId).toBe(owner.id);
      expect(response.body.status).toBe(SessionStatus.OPEN);

      sessionId = response.body.id;
    });

    it('should get session list', async () => {
      const response = await request(app.getHttpServer())
        .get('/sessions')
        .set('Cookie', [`access_token=${ownerTokens.accessToken}`])
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].title).toBe('Friday Lunch');
    });

    it('should join the session as member', async () => {
      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/join`)
        .set('Cookie', [`access_token=${memberTokens.accessToken}`])
        .expect(201);
    });

    it('should fail to submit restaurant if not a member', async () => {
      const nonMember = await authService.findOrCreateUser({
        googleId: 'google-3',
        email: 'nonmember@test.com',
        name: 'Non Member',
      });
      const nonMemberTokens = authService.generateTokens(nonMember);

      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/restaurants`)
        .set('Cookie', [`access_token=${nonMemberTokens.accessToken}`])
        .send({ name: 'Pizza Place' })
        .expect(403);
    });

    it('should submit a restaurant as member', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/restaurants`)
        .set('Cookie', [`access_token=${memberTokens.accessToken}`])
        .send({ name: 'Burger King' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Burger King');
    });

    it('should fail to end session as non-owner', async () => {
      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/end`)
        .set('Cookie', [`access_token=${memberTokens.accessToken}`])
        .expect(403);
    });

    it('should end session as owner and pick a restaurant', async () => {
      const response = await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/end`)
        .set('Cookie', [`access_token=${ownerTokens.accessToken}`])
        .expect(201); // 201 because it's a POST request

      expect(response.body.status).toBe(SessionStatus.ENDED);
      expect(response.body.pickedRestaurantId).toBeDefined();
    });

    it('should fail to join an ended session', async () => {
      const nonMember = await authService.findOrCreateUser({
        googleId: 'google-4',
        email: 'late@test.com',
        name: 'Late User',
      });
      const nonMemberTokens = authService.generateTokens(nonMember);

      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/join`)
        .set('Cookie', [`access_token=${nonMemberTokens.accessToken}`])
        .expect(400);
    });
  });
});

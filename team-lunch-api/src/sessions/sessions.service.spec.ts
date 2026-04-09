import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Session, SessionStatus } from '../database/entities/session.entity';
import { SessionMember } from '../database/entities/session-member.entity';
import { Restaurant } from '../database/entities/restaurant.entity';
import { User } from '../database/entities/user.entity';

const mockUser = (id = 1): User =>
  ({ id, email: `user${id}@test.com`, name: `User ${id}` }) as User;

const mockSession = (overrides: Partial<Session> = {}): Session =>
  ({
    id: 1,
    title: 'Test Session',
    status: SessionStatus.OPEN,
    ownerId: 1,
    members: [],
    restaurants: [],
    ...overrides,
  }) as Session;

const buildRepo = (entity: Partial<Session | SessionMember | Restaurant> = {}) => ({
  findOne: jest.fn().mockResolvedValue(entity),
  find: jest.fn().mockResolvedValue([entity]),
  save: jest.fn().mockImplementation((e) => Promise.resolve({ ...entity, ...e })),
  create: jest.fn().mockImplementation((e) => e),
});

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionRepo: ReturnType<typeof buildRepo>;
  let memberRepo: ReturnType<typeof buildRepo>;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    sessionRepo = buildRepo(mockSession());
    memberRepo = buildRepo();

    moduleRef = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getRepositoryToken(Session), useValue: sessionRepo },
        { provide: getRepositoryToken(SessionMember), useValue: memberRepo },
        { provide: getRepositoryToken(Restaurant), useValue: buildRepo() },
      ],
    }).compile();

    service = moduleRef.get<SessionsService>(SessionsService);
  });

  describe('create', () => {
    it('should create a new session and auto-join owner', async () => {
      const user = mockUser();
      const result = await service.create({ title: 'Lunch Friday' }, user);
      expect(sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Lunch Friday', ownerId: user.id }),
      );
      expect(memberRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: user.id }),
      );
    });
  });

  describe('join', () => {
    it('should throw NotFoundException if session not found', async () => {
      sessionRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.join(99, mockUser())).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session is ENDED', async () => {
      sessionRepo.findOne.mockResolvedValueOnce(mockSession({ status: SessionStatus.ENDED }));
      await expect(service.join(1, mockUser())).rejects.toThrow(BadRequestException);
    });

    it('should be idempotent for already-joined member', async () => {
      memberRepo.findOne.mockResolvedValueOnce({ sessionId: 1, userId: 1 });
      const result = await service.join(1, mockUser());
      expect(memberRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('end', () => {

    it('should throw BadRequestException if no restaurants to pick', async () => {
      sessionRepo.findOne.mockResolvedValueOnce(
        mockSession({ ownerId: 1 }),
      );
      const restaurantRepo = moduleRef.get(getRepositoryToken(Restaurant));
      restaurantRepo.find.mockResolvedValueOnce([]);

      await expect(service.end(1)).rejects.toThrow(BadRequestException);
    });

    it('should pick a restaurant and set status ENDED', async () => {
      const restaurant = { id: 42, name: 'Pizza Co' } as Restaurant;
      sessionRepo.findOne.mockResolvedValueOnce(
        mockSession({ ownerId: 1 }),
      );
      const restaurantRepo = moduleRef.get(getRepositoryToken(Restaurant));
      restaurantRepo.find.mockResolvedValueOnce([restaurant]);

      // Deterministic random — always picks index 0
      const result = await service.end(1, () => restaurant);
      expect(sessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SessionStatus.ENDED,
          pickedRestaurantId: 42,
        }),
      );
    });
  });
});

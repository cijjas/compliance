import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository, SelectQueryBuilder } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../common/entities';
import { UserRole } from '../common/enums';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: jest.Mocked<
    Pick<Repository<User>, 'findOne' | 'create' | 'save' | 'createQueryBuilder'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(() => {
    usersRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    jwtService = {
      sign: jest.fn(),
    };

    service = new AuthService(
      usersRepo as unknown as Repository<User>,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('creates a new user with hashed password', async () => {
      const savedUser = {
        id: 'user-1',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.VIEWER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      usersRepo.findOne.mockResolvedValue(null);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      usersRepo.create.mockReturnValue(savedUser);
      usersRepo.save.mockResolvedValue(savedUser);

      const result = await service.register(dto);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(usersRepo.create).toHaveBeenCalledWith({
        ...dto,
        password: 'hashed-password',
      });
      expect(result).toEqual({
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      });
    });

    it('rejects registration with an existing email', async () => {
      usersRepo.findOne.mockResolvedValue({ id: 'existing' } as User);

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(usersRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('returns an access token and user profile on valid credentials', async () => {
      const user = {
        id: 'user-1',
        email: dto.email,
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.VIEWER,
      } as User;

      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      } as unknown as SelectQueryBuilder<User>;
      usersRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as SelectQueryBuilder<User>,
      );
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(dto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual({
        accessToken: 'jwt-token',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    });

    it('rejects login with wrong password', async () => {
      const user = {
        id: 'user-1',
        email: dto.email,
        password: 'hashed-password',
      } as User;

      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      } as unknown as SelectQueryBuilder<User>;
      usersRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as SelectQueryBuilder<User>,
      );
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects login with non-existent email', async () => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      } as unknown as SelectQueryBuilder<User>;
      usersRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as SelectQueryBuilder<User>,
      );

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      const user = { id: 'user-1' } as User;
      usersRepo.findOne.mockResolvedValue(user);

      await expect(service.findById('user-1')).resolves.toBe(user);
    });

    it('returns null when user not found', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('missing')).resolves.toBeNull();
    });
  });

  describe('logout', () => {
    it('returns a success message', () => {
      const result = service.logout({
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.ADMIN,
      });

      expect(result).toEqual({
        message: 'Logged out successfully',
        userId: 'user-1',
      });
    });
  });
});

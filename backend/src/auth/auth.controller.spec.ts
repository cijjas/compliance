import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../common/enums';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<
    Pick<AuthService, 'register' | 'login' | 'logout'>
  >;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('register delegates to the auth service', async () => {
    const dto: RegisterDto = {
      email: 'user@complif.com',
      password: 'password123',
      firstName: 'Ada',
      lastName: 'Lovelace',
    };
    const result = {
      id: 'user-1',
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.VIEWER,
      isActive: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };
    authService.register.mockResolvedValue(result);

    await expect(controller.register(dto)).resolves.toEqual(result);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('login delegates to the auth service', async () => {
    const dto: LoginDto = {
      email: 'admin@complif.com',
      password: 'admin123',
    };
    const result = {
      accessToken: 'jwt-token',
      user: {
        id: 'user-1',
        email: dto.email,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      },
    };
    authService.login.mockResolvedValue(result);

    await expect(controller.login(dto)).resolves.toEqual(result);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('logout delegates to the auth service with the authenticated user', () => {
    const user: AuthenticatedUser = {
      id: 'user-1',
      email: 'admin@complif.com',
      role: UserRole.ADMIN,
    };
    const result = { message: 'Logged out successfully', userId: user.id };
    authService.logout.mockReturnValue(result);

    expect(controller.logout(user)).toEqual(result);
    expect(authService.logout).toHaveBeenCalledWith(user);
  });
});

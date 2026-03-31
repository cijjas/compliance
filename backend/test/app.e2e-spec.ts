import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { BusinessesController } from '../src/businesses/businesses.controller';
import { BusinessesService } from '../src/businesses/businesses.service';
import { UserRole } from '../src/common/enums';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

const JWT_SECRET = 'e2e-test-secret';

describe('App (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let jwtService: JwtService;
  let authService: Record<string, jest.Mock>;
  let businessesService: Record<string, jest.Mock>;

  beforeAll(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      findById: jest.fn(),
    };
    businessesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      checkTaxIdentifier: jest.fn(),
      previewRiskScore: jest.fn(),
      updateStatus: jest.fn(),
      getRiskScore: jest.fn(),
      getStats: jest.fn(),
      getReferenceData: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController, BusinessesController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: BusinessesService, useValue: businessesService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: string) =>
              key === 'JWT_SECRET' ? JWT_SECRET : fallback,
          },
        },
        JwtStrategy,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    httpServer = app.getHttpServer() as Server;
    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function getAdminToken() {
    return jwtService.sign({
      sub: 'admin-1',
      email: 'admin@complif.com',
      role: UserRole.ADMIN,
    });
  }

  // ------- Auth endpoints -------

  describe('POST /api/auth/login', () => {
    it('returns 200 with a valid login payload', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'jwt-token',
        user: {
          id: 'user-1',
          email: 'admin@complif.com',
          role: UserRole.ADMIN,
        },
      });

      const res = await request(httpServer)
        .post('/api/auth/login')
        .send({ email: 'ADMIN@COMPLIF.COM', password: 'admin123' })
        .expect(201);
      const body = res.body as { accessToken: string };

      expect(body.accessToken).toBe('jwt-token');
      expect(authService.login).toHaveBeenCalledWith({
        email: 'admin@complif.com',
        password: 'admin123',
      });
    });

    it('returns 400 when email is missing', async () => {
      await request(httpServer)
        .post('/api/auth/login')
        .send({ password: 'admin123' })
        .expect(400);

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('returns 400 when password is too short', async () => {
      await request(httpServer)
        .post('/api/auth/login')
        .send({ email: 'admin@complif.com', password: '123' })
        .expect(400);

      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/register', () => {
    it('returns 400 for invalid email format', async () => {
      await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'secret123',
          firstName: 'Ada',
          lastName: 'Lovelace',
        })
        .expect(400);

      expect(authService.register).not.toHaveBeenCalled();
    });

    it('strips unknown fields from the body', async () => {
      authService.register.mockResolvedValue({
        id: 'user-1',
        email: 'ada@test.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: UserRole.VIEWER,
      });

      await request(httpServer)
        .post('/api/auth/register')
        .send({
          email: 'ada@test.com',
          password: 'secret123',
          firstName: 'Ada',
          lastName: 'Lovelace',
          role: 'admin',
        })
        .expect(400);
    });
  });

  // ------- Protected endpoints -------

  describe('GET /api/businesses', () => {
    it('returns 401 without a token', async () => {
      await request(httpServer).get('/api/businesses').expect(401);
    });

    it('returns 200 with a valid token', async () => {
      authService.findById.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@complif.com',
        role: UserRole.ADMIN,
        isActive: true,
      });
      businessesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const res = await request(httpServer)
        .get('/api/businesses')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);
      const body = res.body as { data: unknown[] };

      expect(body.data).toEqual([]);
    });
  });

  describe('GET /api/businesses/stats', () => {
    it('returns aggregated stats', async () => {
      authService.findById.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@complif.com',
        role: UserRole.ADMIN,
        isActive: true,
      });
      businessesService.getStats.mockResolvedValue({
        total: 25,
        byStatus: {
          pending: 10,
          in_review: 5,
          approved: 8,
          rejected: 2,
        },
        avgApprovalDays: 3.2,
        complianceRate: 0.8,
      });

      const res = await request(httpServer)
        .get('/api/businesses/stats')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);
      const body = res.body as {
        total: number;
        byStatus: { approved: number };
        complianceRate: number;
      };

      expect(body.total).toBe(25);
      expect(body.byStatus.approved).toBe(8);
      expect(body.complianceRate).toBe(0.8);
    });
  });

  describe('GET /api/businesses/reference-data', () => {
    it('returns backend-owned compliance reference data', async () => {
      authService.findById.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@complif.com',
        role: UserRole.ADMIN,
        isActive: true,
      });
      businessesService.getReferenceData.mockResolvedValue({
        countries: [{ code: 'AR', name: 'Argentina', riskPoints: 0 }],
        industries: [{ key: 'technology', label: 'Technology', riskPoints: 0 }],
        riskSettings: {
          documentationRiskPoints: 20,
          manualReviewThreshold: 70,
        },
        requiredDocumentTypes: [],
      });

      const res = await request(httpServer)
        .get('/api/businesses/reference-data')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .expect(200);
      const body = res.body as {
        countries: Array<{ code: string }>;
        industries: Array<{ key: string }>;
      };

      expect(body.countries[0]?.code).toBe('AR');
      expect(body.industries[0]?.key).toBe('technology');
    });
  });

  describe('POST /api/businesses', () => {
    it('validates the create business DTO', async () => {
      authService.findById.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@complif.com',
        role: UserRole.ADMIN,
        isActive: true,
      });

      await request(httpServer)
        .post('/api/businesses')
        .set('Authorization', `Bearer ${getAdminToken()}`)
        .send({ name: 'Acme' })
        .expect(400);

      expect(businessesService.create).not.toHaveBeenCalled();
    });
  });
});

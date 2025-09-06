import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../../generated/prisma';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    const signupDto: SignupDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: UserRole.student,
      uniqueIdentifier: 'test-123',
    };

    it('should call authService.signup with correct parameters', async () => {
      const expectedResult = {
        user: {
          id: 1,
          email: signupDto.email,
          name: signupDto.name,
          role: signupDto.role,
        },
        token: 'jwt-token',
      };

      mockAuthService.signup.mockResolvedValue(expectedResult);

      const result = await controller.signup(signupDto);

      expect(authService.signup).toHaveBeenCalledWith(signupDto);
      expect(result).toBe(expectedResult);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should call authService.login with correct parameters', async () => {
      const expectedResult = {
        user: {
          id: 1,
          email: loginDto.email,
          role: UserRole.student,
        },
        token: 'jwt-token',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toBe(expectedResult);
    });
  });
});

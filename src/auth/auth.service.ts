import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    return this.usersService.create({
      name: dto.name,
      email,
      passwordHash,
    });
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createTokenPair(user.id, user.email);
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.createTokenPair(storedToken.user.id, storedToken.user.email);
  }

  async logout(dto: RefreshTokenDto) {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { revoked: true };
  }

  private async createTokenPair(userId: string, email: string) {
    const refreshToken = this.generateRefreshToken();
    await this.storeRefreshToken(userId, refreshToken);

    return {
      accessToken: await this.generateAccessToken(userId, email),
      refreshToken,
    };
  }

  private generateAccessToken(userId: string, email: string) {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    return this.jwtService.signAsync(payload);
  }

  private generateRefreshToken() {
    return randomBytes(64).toString('hex');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private storeRefreshToken(userId: string, refreshToken: string) {
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() +
        this.configService.getOrThrow<number>('REFRESH_TOKEN_EXPIRES_IN_DAYS'),
    );

    return this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt,
      },
    });
  }
}

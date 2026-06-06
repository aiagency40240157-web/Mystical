import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ token: string; role: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ sub: user.id, role: user.role, email: user.email });
    return { token, role: user.role };
  }

  async createUser(email: string, password: string, role: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.upsert({
      where: { email },
      update: { passwordHash, role },
      create: { email, passwordHash, role },
    });
  }
}

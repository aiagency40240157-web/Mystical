import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../decorators/roles.decorator';

function buildKeyMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const role of ['MANAGER', 'AGENT', 'ASSISTANT', 'SYSTEM'] as const) {
    const key = process.env[`API_KEY_${role}`];
    if (key) map[key] = role;
  }
  return map;
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly keyToRole: Record<string, string>;

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    this.keyToRole = buildKeyMap();
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const headers = request['headers'] as Record<string, string>;

    const apiKey = headers['x-api-key'];
    if (apiKey) {
      const role = this.keyToRole[apiKey];
      return !!role && requiredRoles.includes(role);
    }

    const authorization = headers['authorization'];
    if (authorization?.startsWith('Bearer ')) {
      try {
        const token = authorization.slice(7);
        const payload = this.jwtService.verify<{ role: string }>(token, {
          secret: process.env.JWT_SECRET ?? 'changeme-set-JWT_SECRET-in-env',
        });
        return !!payload.role && requiredRoles.includes(payload.role);
      } catch {
        return false;
      }
    }

    return false;
  }
}

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

export type AppRole = 'AGENT' | 'ASSISTANT' | 'MANAGER' | 'SYSTEM';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

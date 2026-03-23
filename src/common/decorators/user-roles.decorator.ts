import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../typeorm/entities';

export const USER_ROLE_KEY = 'user_role';
export const RequireUserRole = (...roles: UserRole[]) => SetMetadata(USER_ROLE_KEY, roles);

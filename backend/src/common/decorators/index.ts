// ── common/decorators/roles.decorator.ts ─────────────────────
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// ── common/decorators/current-user.decorator.ts ──────────────
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// ── common/decorators/api-key.decorator.ts ───────────────────
export const API_KEY_METADATA = 'requireApiKey';
export const RequireApiKey = () => SetMetadata(API_KEY_METADATA, true);

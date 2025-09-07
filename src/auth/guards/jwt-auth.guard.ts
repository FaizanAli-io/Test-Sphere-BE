import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    console.log(
      `JWT Guard - ${request.method} - ${request.path} - Auth Header: ${authHeader}`,
    );

    return super.canActivate(context);
  }
}

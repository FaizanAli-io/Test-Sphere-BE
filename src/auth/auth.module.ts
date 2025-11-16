import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@config/config.service";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { EmailModule } from "../email/email.module";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    EmailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: "2h",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

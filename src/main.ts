import { AppModule } from './app.module';
import { ConfigService } from '@config/config.service';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
      validationError: { target: false, value: false },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Test Sphere API')
    .setDescription('API Documentation for Test Sphere')
    .setVersion('1.0.4.8.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    customfavIcon: '../favicon.ico',
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const configService = app.get<ConfigService>(ConfigService);
  const port = configService.get('PORT') || 5000;
  await app.listen(port, '0.0.0.0');
}
void bootstrap();

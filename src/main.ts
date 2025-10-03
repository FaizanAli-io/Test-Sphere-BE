import { AppModule } from './app.module';
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
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Test Sphere API')
    .setDescription(
      'API Documentation for Test Sphere - An AI-Powered Test Management System',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Enable CORS
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  fetchTokens();
}
bootstrap();

async function fetchTokens() {
  const baseURL = 'http://localhost:3000/auth/login';

  const users = [
    { email: 'learn@mailinator.com', password: '1234567' },
    { email: 'teach@mailinator.com', password: '1234567' },
  ];

  const tokens = {};

  for (const user of users) {
    const res = await fetch(baseURL, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
      method: 'POST',
    });

    if (!res.ok) console.error(`${user.email} login failed: ${res.status}`);

    const data = await res.json();
    tokens[user.email] = data.token;
  }

  console.log(tokens);
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTypeOrmConfig } from './typeorm.config';

@Module({ imports: [TypeOrmModule.forRoot(createTypeOrmConfig())] })
export class TypeOrmConfigModule {}

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { AppModule } from './src/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle('TeamLunch API')
    .setDescription('Real-time collaborative lunch restaurant picker')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const yamlDocument = yaml.dump(document);
  fs.writeFileSync('../docs/api/openapi.generated.yaml', yamlDocument);
  console.log('OpenAPI spec generated at docs/api/openapi.generated.yaml');
  await app.close();
}
bootstrap();

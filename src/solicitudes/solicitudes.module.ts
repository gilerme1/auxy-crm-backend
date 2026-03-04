import { Module } from '@nestjs/common';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';
import { FilesModule } from '../files/files.module';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [FilesModule, GeocodingModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
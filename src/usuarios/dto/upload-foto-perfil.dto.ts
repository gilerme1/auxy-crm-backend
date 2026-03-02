import { ApiProperty } from '@nestjs/swagger';
import type { Multer } from 'multer';

export class UploadFotoPerfilDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Foto de perfil a subir (JPG, PNG, WEBP)',
  })
  file: Multer.File;
}

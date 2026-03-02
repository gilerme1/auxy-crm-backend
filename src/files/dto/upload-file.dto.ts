import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { Multer } from 'multer';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Archivo a subir',
  })
  file: any;

  @ApiProperty({
    example: 'solicitudes',
    required: false,
    description: 'Carpeta en Cloudinary',
  })
  @IsOptional()
  @IsString()
  folder?: string;
}

export class UpdatePhotoUserDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Foto de perfil del usuario',
  })
  file: any;
}

export class UploadSolicitudPhotosDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Fotos de la solicitud',
  })
  files: Multer.File[];

  @ApiProperty({
    example: 'uuid-solicitud',
    description: 'ID de la solicitud',
  })
  @IsString()
  solicitudId: string;
}

export class DeleteFileDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    example: ['folder/publicId1', 'folder/publicId2'],
    description: 'Array de Public IDs de Cloudinary',
  })
  @IsArray()
  publicIds: string[];
}

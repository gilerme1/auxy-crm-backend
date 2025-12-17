import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoAuxilio, Prioridad } from '@prisma/client';

export class CreateSolicitudDto {
    @ApiProperty({ enum: TipoAuxilio, example: TipoAuxilio.GRUA })
    @IsEnum(TipoAuxilio)
    tipo: TipoAuxilio;

    @ApiProperty({ enum: Prioridad, example: Prioridad.ALTA })
    @IsEnum(Prioridad)
    prioridad: Prioridad;

    @ApiProperty({ example: 'uuid-vehiculo' })
    @IsUUID()
    vehiculoId: string;

    @ApiProperty({ example: -34.9011, description: 'Latitud' })
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitud: number;

    @ApiProperty({ example: -56.1645, description: 'Longitud' })
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitud: number;

    @ApiProperty({ example: 'Av. 18 de Julio 1234, Montevideo' })
    @IsString()
    @MaxLength(500)
    direccion: string;

    @ApiProperty({ example: 'El vehículo no arranca', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    observaciones?: string;

    @ApiProperty({ type: [String], required: false, description: 'URLs de fotos' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    fotos?: string[];
}
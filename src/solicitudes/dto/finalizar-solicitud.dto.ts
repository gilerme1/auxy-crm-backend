import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FinalizarSolicitudDto {
    @ApiProperty({ example: 2500.50, description: 'Costo final del servicio' })
    @IsNumber()
    @Min(0)
    costoFinal: number;

    @ApiProperty({ required: false, example: 'Servicio completado exitosamente' })
    @IsOptional()
    @IsString()
    observaciones?: string;
}
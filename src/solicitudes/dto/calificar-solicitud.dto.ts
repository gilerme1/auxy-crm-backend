import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalificarSolicitudDto {
    @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
    @IsInt()
    @Min(1)
    @Max(5)
    calificacion: number;

    @ApiProperty({ required: false, example: 'Excelente servicio' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    comentario?: string;
}
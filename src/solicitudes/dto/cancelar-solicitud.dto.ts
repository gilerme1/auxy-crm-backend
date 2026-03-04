import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelarSolicitudDto {
  @ApiProperty({ example: 'El cliente ya no requiere el servicio' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo: string;
}

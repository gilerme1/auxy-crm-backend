import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AceptarSolicitudDto {
  @IsUUID()
  @IsOptional()
  @ApiProperty({ description: 'ID del operador (usuario del proveedor) que atenderá el servicio', required: false })
  operadorId?: string;

  @IsUUID()
  @IsOptional()
  @ApiProperty({ description: 'ID del vehículo del proveedor asignado al servicio', required: false })
  vehiculoProveedorId?: string;
}

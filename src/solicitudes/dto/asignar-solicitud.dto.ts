import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AsignarSolicitudDto {
    @ApiProperty({ example: 'uuid-proveedor' })
    @IsUUID()
    proveedorId: string;
}
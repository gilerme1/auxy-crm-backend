import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AsignarSolicitudDto {
    @ApiProperty({ example: 'uuid-proveedor' })
    @IsUUID()
    proveedorId: string;

    @ApiPropertyOptional({
        example: 'uuid-vehiculo-proveedor',
        description: 'ID del recurso específico del proveedor (grúa, camioneta, etc.). Opcional.',
    })
    @IsOptional()
    @IsUUID()
    vehiculoProveedorId?: string;
}
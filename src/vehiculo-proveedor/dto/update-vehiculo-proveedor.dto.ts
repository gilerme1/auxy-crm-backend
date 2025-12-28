import { PartialType } from '@nestjs/swagger';
import { CreateVehiculoProveedorDto } from './create-vehiculo-proveedor.dto';

export class UpdateVehiculoProveedorDto extends PartialType(CreateVehiculoProveedorDto) {}
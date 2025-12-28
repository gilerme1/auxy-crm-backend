import { Module } from '@nestjs/common';
import { VehiculosProveedorService } from './vehiculos-proveedor.service';
import { VehiculosProveedorController } from './vehiculos-proveedor.controller';

@Module({
    controllers: [VehiculosProveedorController],
    providers: [VehiculosProveedorService],
    exports: [VehiculosProveedorService], 
})
export class VehiculosProveedorModule {}
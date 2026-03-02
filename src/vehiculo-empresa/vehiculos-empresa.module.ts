import { Module } from '@nestjs/common';
import { VehiculosController } from './vehiculos-empresa.controller';
import { VehiculosEmpresaService } from './vehiculos-empresa.service';

@Module({
    controllers: [VehiculosController],
    providers: [VehiculosEmpresaService],
    exports: [VehiculosEmpresaService],
})
export class VehiculosModule {}
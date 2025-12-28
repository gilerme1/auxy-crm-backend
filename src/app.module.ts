import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EmpresasModule } from './empresas/empresas.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { PlanesModule } from './planes/planes.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { VehiculosProveedorModule } from './vehiculo-proveedor/vehiculos-proveedor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    EmpresasModule,
    VehiculosModule,
    ProveedoresModule,
    SolicitudesModule,
    VehiculosProveedorModule,
    PlanesModule,
  ],
  providers: [
    // Guard global: todas las rutas requieren auth por defecto
    // Usar @Public() para rutas públicas
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
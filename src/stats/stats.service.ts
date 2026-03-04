import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoSolicitud } from '@prisma/client';
import { startOfDay } from 'date-fns/startOfDay';
import { subDays } from 'date-fns/subDays';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Estadísticas para SUPER_ADMIN: Visión global de toda la plataforma
   */
  async getSuperAdminStats() {
    const totalSolicitudes = await this.prisma.solicitudAuxilio.count();
    
    const estados = await this.prisma.solicitudAuxilio.groupBy({
      by: ['estado'],
      _count: { estado: true },
    });

    const revenue = await this.prisma.solicitudAuxilio.aggregate({
      where: { estado: EstadoSolicitud.FINALIZADO },
      _sum: { costoFinal: true },
    });

    const entidades = {
      empresas: await this.prisma.empresa.count({ where: { isActive: true } }),
      proveedores: await this.prisma.proveedor.count({ where: { isActive: true } }),
      usuarios: await this.prisma.usuario.count({ where: { isActive: true } }),
    };

    const porTipo = await this.prisma.solicitudAuxilio.groupBy({
      by: ['tipo'],
      _count: { tipo: true },
    });

    // Calcular solicitudes de hoy vs ayer para tendencia
    const hoy: Date = startOfDay(new Date());
    const ayer: Date = startOfDay(subDays(new Date(), 1));
    
    const creadasHoy: number = await this.prisma.solicitudAuxilio.count({
      where: { fechaSolicitud: { gte: hoy } },
    });
    
    const creadasAyer: number = await this.prisma.solicitudAuxilio.count({
      where: { 
        fechaSolicitud: { 
          gte: ayer,
          lt: hoy
        } 
      },
    });

    return {
      total: totalSolicitudes,
      revenueGlobal: revenue._sum.costoFinal || 0,
      entidades,
      estados: estados.reduce((acc: Record<string, number>, curr) => ({ ...acc, [curr.estado]: curr._count.estado }), {}),
      tendenciaHoy: {
        hoy: creadasHoy,
        ayer: creadasAyer,
        diferencia: creadasHoy - creadasAyer
      },
      distribucionTipo: porTipo.map(t => ({ tipo: t.tipo, cantidad: t._count.tipo }))
    };
  }

  /**
   * Estadísticas para PROVEEDOR_ADMIN: Visión de su empresa y operadores
   */
  async getProveedorStats(proveedorId: string) {
    if (!proveedorId) throw new ForbiddenException('No tienes un proveedor asociado');

    const solicitudes = await this.prisma.solicitudAuxilio.aggregate({
      where: { proveedorId },
      _count: { id: true },
      _sum: { costoFinal: true },
    });

    const calificacion = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { calificacionPromedio: true }
    });

    const estados = await this.prisma.solicitudAuxilio.groupBy({
      where: { proveedorId },
      by: ['estado'],
      _count: { estado: true },
    });

    const recursos = await this.prisma.vehiculoProveedor.count({
      where: { proveedorId, isActive: true }
    });

    // Incomes last 7 days
    const hace7dias: Date = subDays(new Date(), 7);
    const facturacionSemanal = await this.prisma.solicitudAuxilio.groupBy({
      where: { 
        proveedorId, 
        estado: EstadoSolicitud.FINALIZADO,
        fechaFinalizacion: { gte: hace7dias }
      },
      by: ['fechaFinalizacion'],
      _sum: { costoFinal: true }
    });

    return {
      totalServicios: solicitudes._count.id,
      facturacionTotal: solicitudes._sum.costoFinal || 0,
      calificacion: calificacion?.calificacionPromedio || 0,
      vehiculosActivos: recursos,
      estados: estados.reduce((acc: Record<string, number>, curr) => ({ ...acc, [curr.estado]: curr._count.estado }), {}),
      facturacionSemanal: facturacionSemanal.map(f => ({
        fecha: f.fechaFinalizacion,
        monto: f._sum.costoFinal || 0
      }))
    };
  }

  /**
   * Estadísticas para CLIENTE_ADMIN: Visión de gastos de su empresa
   */
  async getClienteStats(empresaId: string) {
    if (!empresaId) throw new ForbiddenException('No tienes una empresa asociada');

    const totalGastado = await this.prisma.solicitudAuxilio.aggregate({
      where: { empresaId, estado: EstadoSolicitud.FINALIZADO },
      _sum: { costoFinal: true },
      _count: { id: true }
    });

    const solicitudesPorVehiculo = await this.prisma.solicitudAuxilio.groupBy({
      where: { empresaId },
      by: ['vehiculoId'],
      _count: { id: true },
    });

    const estados = await this.prisma.solicitudAuxilio.groupBy({
      where: { empresaId },
      by: ['estado'],
      _count: { estado: true }
    });

    return {
      totalGastado: totalGastado._sum.costoFinal || 0,
      totalSolicitudes: totalGastado._count.id,
      estados: estados.reduce((acc: Record<string, number>, curr) => ({ ...acc, [curr.estado]: curr._count.estado }), {}),
      frecuenciaIncidentes: solicitudesPorVehiculo.map(s => ({ vehiculoId: s.vehiculoId, cantidad: s._count.id }))
    };
  }
}

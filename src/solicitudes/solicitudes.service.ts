/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { AsignarSolicitudDto } from './dto/asignar-solicitud.dto';
import { FinalizarSolicitudDto } from './dto/finalizar-solicitud.dto';
import { CalificarSolicitudDto } from './dto/calificar-solicitud.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { QuerySolicitudDto } from './dto/query-solicitud.dto';
import { EstadoSolicitud, RolUsuario, Prisma } from '@prisma/client';

@Injectable()
export class SolicitudesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSolicitudDto, userId: string) {
    // Verificar que el vehículo existe
    const vehiculo = await this.prisma.vehiculo.findUnique({
      where: { id: dto.vehiculoId },
      include: { empresa: true },
    });

    if (!vehiculo) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    // Verificar que el usuario existe
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar acceso
    if (
      usuario.rol !== RolUsuario.SUPER_ADMIN &&
      usuario.empresaId !== vehiculo.empresaId
    ) {
      throw new ForbiddenException('No tienes acceso a este vehículo');
    }

    // Crear solicitud
    return this.prisma.solicitudAuxilio.create({
      data: {
        tipo: dto.tipo,
        prioridad: dto.prioridad,
        latitud: dto.latitud,
        longitud: dto.longitud,
        direccion: dto.direccion,
        observaciones: dto.observaciones,
        fotos: dto.fotos || [],
        vehiculoId: dto.vehiculoId,
        empresaId: vehiculo.empresaId,
        solicitadoPorId: userId,
      },
      include: {
        vehiculo: true,
        empresa: true,
        solicitadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(query: QuerySolicitudDto, userId: string, userRole: string) {
    // Solución a 'possibly undefined': asignar valores por defecto
    const { 
      page = 1, 
      limit = 10, 
      estado, 
      tipo, 
      empresaId, 
      proveedorId, 
      vehiculoId 
    } = query;
    
    const skip = (page - 1) * limit;

    // Solución a 'any': Usar el tipo de Prisma para filtros
    const where: Prisma.SolicitudAuxilioWhereInput = {};

    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (vehiculoId) where.vehiculoId = vehiculoId;

    // Filtros según rol
    if (userRole === RolUsuario.ADMIN || userRole === RolUsuario.OPERATOR) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: userId },
      });
      if (usuario?.empresaId) where.empresaId = usuario.empresaId;
    } else if (userRole === RolUsuario.PROVIDER) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: userId },
      });
      if (usuario?.proveedorId) where.proveedorId = usuario.proveedorId;
    }

    if (empresaId) where.empresaId = empresaId;
    if (proveedorId) where.proveedorId = proveedorId;

    const [solicitudes, total] = await Promise.all([
      this.prisma.solicitudAuxilio.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaSolicitud: 'desc' },
        include: {
          vehiculo: true,
          empresa: {
            select: { id: true, razonSocial: true },
          },
          proveedor: {
            select: { id: true, razonSocial: true },
          },
          solicitadoPor: {
            select: { id: true, nombre: true, apellido: true },
          },
        },
      }),
      this.prisma.solicitudAuxilio.count({ where }),
    ]);

    return {
      data: solicitudes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string, userRole: string) {
    const solicitud = await this.prisma.solicitudAuxilio.findUnique({
      where: { id },
      include: {
        vehiculo: true,
        empresa: true,
        proveedor: true,
        solicitadoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true,
          },
        },
        atendidoPor: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true,
          },
        },
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    await this.checkAccess(solicitud, userId, userRole);
    return solicitud;
  }

  async asignar(id: string, dto: AsignarSolicitudDto, userId: string) {
    const solicitud = await this.findOne(id, userId, RolUsuario.SUPER_ADMIN);

    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException('Solo se pueden asignar solicitudes pendientes');
    }

    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: dto.proveedorId },
    });

    // Corrección: .activo -> .isActive
    if (!proveedor || !proveedor.isActive) {
      throw new NotFoundException('Proveedor no encontrado o inactivo');
    }

    return this.prisma.solicitudAuxilio.update({
      where: { id },
      data: {
        proveedorId: dto.proveedorId,
        estado: EstadoSolicitud.ASIGNADO,
        fechaAsignacion: new Date(),
      },
      include: {
        proveedor: true,
        vehiculo: true,
        empresa: true,
      },
    });
  }

  async cambiarEstado(
    id: string,
    dto: CambiarEstadoDto,
    userId: string,
    userRole: string,
  ) {
    const solicitud = await this.findOne(id, userId, userRole);
    this.validateStateTransition(solicitud.estado, dto.estado);

    // Tipado de actualización para evitar 'any'
    const updateData: Prisma.SolicitudAuxilioUpdateInput = {
      estado: dto.estado,
    };

    if (dto.estado === EstadoSolicitud.EN_CAMINO && !solicitud.fechaInicio) {
      updateData.fechaInicio = new Date();
      updateData.atendidoPor = { connect: { id: userId } };
    }

    if (dto.estado === EstadoSolicitud.FINALIZADO) {
      updateData.fechaFinalizacion = new Date();
    }

    if (dto.estado === EstadoSolicitud.CANCELADO) {
      updateData.fechaCancelacion = new Date();
      updateData.motivoCancelacion = dto.motivo;
    }

    return this.prisma.solicitudAuxilio.update({
      where: { id },
      data: updateData,
    });
  }

  async finalizar(id: string, dto: FinalizarSolicitudDto, userId: string) {
    const solicitud = await this.findOne(id, userId, RolUsuario.PROVIDER);

    if (solicitud.estado !== EstadoSolicitud.EN_SERVICIO) {
      throw new BadRequestException('Solo se pueden finalizar solicitudes en servicio');
    }

    return this.prisma.solicitudAuxilio.update({
      where: { id },
      data: {
        estado: EstadoSolicitud.FINALIZADO,
        costoFinal: dto.costoFinal,
        fechaFinalizacion: new Date(),
        observaciones: dto.observaciones || solicitud.observaciones,
      },
    });
  }

  async calificar(id: string, dto: CalificarSolicitudDto, userId: string) {
    const solicitud = await this.findOne(id, userId, RolUsuario.ADMIN);

    if (solicitud.estado !== EstadoSolicitud.FINALIZADO) {
      throw new BadRequestException('Solo se pueden calificar servicios finalizados');
    }

    if (solicitud.calificacion) {
      throw new BadRequestException('Este servicio ya fue calificado');
    }

    const updated = await this.prisma.solicitudAuxilio.update({
      where: { id },
      data: {
        calificacion: dto.calificacion,
        comentarioCliente: dto.comentario,
      },
    });

    if (solicitud.proveedorId) {
      await this.updateProveedorRating(solicitud.proveedorId);
    }

    return updated;
  }

 async cancelar(id: string, motivo: string, userId: string, userRole: string) {
    // CORRECCIÓN: Volvemos a llamar a findOne para obtener 'solicitud'
    const solicitud = await this.findOne(id, userId, userRole);

    const estadosCancelables: EstadoSolicitud[] = [
      EstadoSolicitud.PENDIENTE, 
      EstadoSolicitud.ASIGNADO
    ];

    if (!estadosCancelables.includes(solicitud.estado)) {
      throw new BadRequestException('No se puede cancelar esta solicitud');
    }

    return this.prisma.solicitudAuxilio.update({
      where: { id },
      data: {
        estado: EstadoSolicitud.CANCELADO,
        fechaCancelacion: new Date(),
        motivoCancelacion: motivo,
      },
    });
  }

  private async checkAccess(solicitud: any, userId: string, userRole: string) {
    if (userRole === RolUsuario.SUPER_ADMIN) return;

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) throw new ForbiddenException('Usuario no válido');

    if (userRole === RolUsuario.ADMIN || userRole === RolUsuario.OPERATOR) {
      if (solicitud.empresaId !== usuario.empresaId) {
        throw new ForbiddenException('No tienes acceso a esta solicitud');
      }
    } else if (userRole === RolUsuario.PROVIDER) {
      if (solicitud.proveedorId !== usuario.proveedorId) {
        throw new ForbiddenException('No tienes acceso a esta solicitud');
      }
    }
  }

  private validateStateTransition(currentState: EstadoSolicitud, newState: EstadoSolicitud) {
    const validTransitions: Record<EstadoSolicitud, EstadoSolicitud[]> = {
      [EstadoSolicitud.PENDIENTE]: [EstadoSolicitud.ASIGNADO, EstadoSolicitud.CANCELADO],
      [EstadoSolicitud.ASIGNADO]: [EstadoSolicitud.EN_CAMINO, EstadoSolicitud.CANCELADO],
      [EstadoSolicitud.EN_CAMINO]: [EstadoSolicitud.EN_SERVICIO],
      [EstadoSolicitud.EN_SERVICIO]: [EstadoSolicitud.FINALIZADO],
      [EstadoSolicitud.FINALIZADO]: [],
      [EstadoSolicitud.CANCELADO]: [],
    };

    if (!validTransitions[currentState].includes(newState)) {
      throw new BadRequestException(
        `No se puede cambiar de ${currentState} a ${newState}`,
      );
    }
  }

  private async updateProveedorRating(proveedorId: string) {
    const solicitudes = await this.prisma.solicitudAuxilio.findMany({
      where: {
        proveedorId,
        calificacion: { not: null },
      },
      select: { calificacion: true },
    });

    if (solicitudes.length > 0) {
      const promedio =
        solicitudes.reduce((sum, s) => sum + (s.calificacion ?? 0), 0) / solicitudes.length;

      await this.prisma.proveedor.update({
        where: { id: proveedorId },
        data: { calificacionPromedio: promedio },
      });
    }
  }
}
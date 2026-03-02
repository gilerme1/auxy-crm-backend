import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { AsignarSolicitudDto } from './dto/asignar-solicitud.dto';
import { FinalizarSolicitudDto } from './dto/finalizar-solicitud.dto';
import { CalificarSolicitudDto } from './dto/calificar-solicitud.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { QuerySolicitudDto } from './dto/query-solicitud.dto';
import {
  EstadoSolicitud,
  RolUsuario,
  Prisma,
  TipoAuxilio,
  EstadoDisponibilidad,
  EstadoVehiculo,
  TipoVehiculoProveedor,
  TipoVehiculo,
  SolicitudAuxilio,
} from '@prisma/client';
import type { Multer } from 'multer';

@Injectable()
export class SolicitudesService {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  async create(dto: CreateSolicitudDto, userId: string) {
    // Validar coordenadas
    if (
      typeof dto.latitud !== 'number' ||
      dto.latitud < -90 ||
      dto.latitud > 90 ||
      typeof dto.longitud !== 'number' ||
      dto.longitud < -180 ||
      dto.longitud > 180
    ) {
      throw new BadRequestException(
        'Coordenadas de ubicación inválidas. Latitud debe estar entre -90 y 90, longitud entre -180 y 180.',
      );
    }
    const vehiculo = await this.prisma.vehiculo.findUnique({
      where: { id: dto.vehiculoId },
      include: { empresa: true },
    });

    if (!vehiculo) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (
      usuario.rol !== RolUsuario.SUPER_ADMIN &&
      usuario.empresaId !== vehiculo.empresaId
    ) {
      throw new ForbiddenException('No tienes acceso a este vehículo');
    }

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
          select: { id: true, nombre: true, apellido: true, email: true },
        },
      },
    });
  }

  async findAll(
    query: QuerySolicitudDto,
    userId: string,
    userRole: RolUsuario, // Cambiamos a tipo RolUsuario directamente
  ) {
    const {
      page = 1,
      limit = 10,
      estado,
      tipo,
      empresaId,
      proveedorId,
      vehiculoId,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SolicitudAuxilioWhereInput = {};

    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (vehiculoId) where.vehiculoId = vehiculoId;

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) throw new ForbiddenException('Usuario no válido');

    // Filtros según rol - usamos comparación directa con enum
    if (
      userRole === RolUsuario.CLIENTE_ADMIN ||
      userRole === RolUsuario.CLIENTE_OPERADOR
    ) {
      if (usuario.empresaId) where.empresaId = usuario.empresaId;
    } else if (
      userRole === RolUsuario.PROVEEDOR_ADMIN ||
      userRole === RolUsuario.PROVEEDOR_OPERADOR
    ) {
      if (usuario.proveedorId) where.proveedorId = usuario.proveedorId;
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
          empresa: { select: { id: true, razonSocial: true } },
          proveedor: { select: { id: true, razonSocial: true } },
          solicitadoPor: { select: { id: true, nombre: true, apellido: true } },
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

  async findOne(id: string, userId: string, userRole: RolUsuario) {
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
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    await this.checkAccess(solicitud, userId, userRole);

    return solicitud;
  }

  async asignar(id: string, dto: AsignarSolicitudDto, userId: string) {
    const solicitud = await this.findOne(id, userId, RolUsuario.SUPER_ADMIN);
    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException(
        'Solo solicitudes pendientes pueden asignarse',
      );
    }

    const vehiculoCliente = await this.prisma.vehiculo.findUnique({
      where: { id: solicitud.vehiculoId },
    });

    if (!vehiculoCliente)
      throw new NotFoundException('Vehículo cliente no encontrado');

    // 1. Validar proveedor
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: dto.proveedorId },
    });

    if (!proveedor || !proveedor.isActive) {
      throw new NotFoundException('Proveedor no encontrado o inactivo');
    }

    // 2. Validar vehículo proveedor SI se envía (tipado seguro)
    let vehiculoProveedorSeleccionado: {
      id: string;
      proveedorId: string;
      isActive: boolean;
      tipos: TipoVehiculoProveedor[];
    } | null = null;

    if (dto.vehiculoProveedorId) {
      vehiculoProveedorSeleccionado =
        await this.prisma.vehiculoProveedor.findUnique({
          where: { id: dto.vehiculoProveedorId },
          select: {
            id: true,
            proveedorId: true,
            isActive: true,
            tipos: true,
          },
        });

      if (!vehiculoProveedorSeleccionado) {
        throw new NotFoundException('Vehículo de proveedor no encontrado');
      }

      if (vehiculoProveedorSeleccionado.proveedorId !== dto.proveedorId) {
        throw new BadRequestException('El vehículo pertenece a otro proveedor');
      }

      if (!vehiculoProveedorSeleccionado.isActive) {
        throw new BadRequestException('El vehículo de proveedor está inactivo');
      }

      // Validación de compatibilidad
      if (
        vehiculoCliente.tipo === TipoVehiculo.CAMION &&
        !vehiculoProveedorSeleccionado.tipos.includes(
          TipoVehiculoProveedor.GRUA_PESADA_CAMIONES,
        )
      ) {
        throw new BadRequestException(
          'Camiones requieren GRUA_PESADA_CAMIONES',
        );
      }
    }

    // 3. Buscar operadores disponibles del proveedor
    const candidatos = await this.prisma.usuario.findMany({
      where: {
        rol: RolUsuario.PROVEEDOR_OPERADOR,
        estadoDisponibilidad: EstadoDisponibilidad.DISPONIBLE,
        proveedorId: dto.proveedorId,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        vehiculoProveedorId: true,
        proveedor: true,
      },
    });

    if (candidatos.length === 0) {
      throw new NotFoundException(
        'No hay operadores disponibles en este proveedor',
      );
    }

    // 4. Elegir operador (primero por simplicidad)
    const operadorAsignado = candidatos[0];

    // 5. Auto-asignar vehículo del operador si no se especifica manualmente
    let vehiculoProveedorIdFinal = dto.vehiculoProveedorId;
    if (!vehiculoProveedorIdFinal && operadorAsignado.vehiculoProveedorId) {
      vehiculoProveedorIdFinal = operadorAsignado.vehiculoProveedorId;
    }

    // 6. Actualizar solicitud
    const updated = await this.prisma.solicitudAuxilio.update({
      where: { id },
      data: {
        proveedorId: dto.proveedorId,
        vehiculoProveedorId: vehiculoProveedorIdFinal ?? null,
        atendidoPorId: operadorAsignado.id,
        estado: EstadoSolicitud.ASIGNADO,
        fechaAsignacion: new Date(),
      },
      include: {
        proveedor: true,
        vehiculo: true,
        vehiculoProveedor: true,
        atendidoPor: true,
      },
    });

    // 6. Marcar operador como ocupado
    await this.prisma.usuario.update({
      where: { id: operadorAsignado.id },
      data: { estadoDisponibilidad: EstadoDisponibilidad.OCUPADO },
    });

    return updated;
  }

  async cambiarEstado(
    id: string,
    dto: CambiarEstadoDto,
    userId: string,
    userRole: RolUsuario,
  ) {
    const solicitud = await this.findOne(id, userId, userRole);
    this.validateStateTransition(solicitud.estado, dto.estado);

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

  async getRecursosDisponibles(solicitudId: string, userId: string) {
    const solicitud = await this.findOne(
      solicitudId,
      userId,
      RolUsuario.SUPER_ADMIN,
    );

    // Buscar vehículos activos del proveedor asociado (o de todos si no hay proveedor aún)
    const recursos = await this.prisma.vehiculoProveedor.findMany({
      where: {
        proveedor: {
          isActive: true,
        },
        isActive: true,
        estado: EstadoVehiculo.ACTIVO,
      },
      include: {
        proveedor: { select: { id: true, razonSocial: true } },
      },
      orderBy: { marca: 'asc' },
    });

    // Filtrar por compatibilidad básica (opcional, puedes mejorar con distancia más adelante)
    const compatibles = recursos.filter((r) => {
      if (
        solicitud.tipo === TipoAuxilio.GRUA &&
        solicitud.vehiculo.tipo === TipoVehiculo.CAMION
      ) {
        return r.tipos.includes(TipoVehiculoProveedor.GRUA_PESADA_CAMIONES);
      }
      return true; // por defecto, todos los demás
    });

    return compatibles;
  }

  async finalizar(id: string, dto: FinalizarSolicitudDto, userId: string) {
    const solicitud = await this.findOne(
      id,
      userId,
      RolUsuario.PROVEEDOR_OPERADOR,
    );

    if (solicitud.estado !== EstadoSolicitud.EN_SERVICIO) {
      throw new BadRequestException(
        'Solo se pueden finalizar solicitudes en servicio',
      );
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
    const solicitud = await this.findOne(id, userId, RolUsuario.CLIENTE_ADMIN);

    if (solicitud.estado !== EstadoSolicitud.FINALIZADO) {
      throw new BadRequestException(
        'Solo se pueden calificar servicios finalizados',
      );
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

  async cancelar(
    id: string,
    motivo: string,
    userId: string,
    userRole: RolUsuario,
  ) {
    const solicitud = await this.findOne(id, userId, userRole);

    const estadosCancelables: EstadoSolicitud[] = [
      EstadoSolicitud.PENDIENTE,
      EstadoSolicitud.ASIGNADO,
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

  private async checkAccess(
    solicitud: SolicitudAuxilio,
    userId: string,
    userRole: RolUsuario,
  ) {
    if (userRole === RolUsuario.SUPER_ADMIN) return;

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!usuario) throw new ForbiddenException('Usuario no válido');

    if (
      userRole === RolUsuario.CLIENTE_ADMIN ||
      userRole === RolUsuario.CLIENTE_OPERADOR
    ) {
      if (solicitud.empresaId !== usuario.empresaId) {
        throw new ForbiddenException('No tienes acceso a esta solicitud');
      }
    } else if (
      userRole === RolUsuario.PROVEEDOR_ADMIN ||
      userRole === RolUsuario.PROVEEDOR_OPERADOR
    ) {
      if (solicitud.proveedorId !== usuario.proveedorId) {
        throw new ForbiddenException('No tienes acceso a esta solicitud');
      }
    }
  }

  private validateStateTransition(
    currentState: EstadoSolicitud,
    newState: EstadoSolicitud,
  ) {
    const validTransitions: Record<EstadoSolicitud, EstadoSolicitud[]> = {
      [EstadoSolicitud.PENDIENTE]: [
        EstadoSolicitud.ASIGNADO,
        EstadoSolicitud.CANCELADO,
      ],
      [EstadoSolicitud.ASIGNADO]: [
        EstadoSolicitud.EN_CAMINO,
        EstadoSolicitud.CANCELADO,
      ],
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
      where: { proveedorId, calificacion: { not: null } },
      select: { calificacion: true },
    });

    if (solicitudes.length > 0) {
      const promedio =
        solicitudes.reduce((sum, s) => sum + (s.calificacion ?? 0), 0) /
        solicitudes.length;
      await this.prisma.proveedor.update({
        where: { id: proveedorId },
        data: { calificacionPromedio: promedio },
      });
    }
  }

  /**
   * Subir fotos a una solicitud existente
   */
  async uploadFotos(
    solicitudId: string,
    files: Multer.File[],
    userId: string,
    userRole: RolUsuario,
  ) {
    const solicitud = await this.findOne(solicitudId, userId, userRole);

    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron archivos');
    }

    try {
      const results = await this.filesService.uploadMultiple(files, {
        folder: `auxy/solicitudes/${solicitudId}`,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      });

      const fotoUrls = results.map((r) => r.secure_url);

      const fotosActuales = solicitud.fotos || [];
      const fotosActualizadas = [...fotosActuales, ...fotoUrls];

      return this.prisma.solicitudAuxilio.update({
        where: { id: solicitudId },
        data: { fotos: fotosActualizadas },
        include: {
          vehiculo: true,
          empresa: true,
          proveedor: true,
          solicitadoPor: { select: { id: true, nombre: true, apellido: true } },
        },
      });
    } catch (error) {
      this.logger.error(
        `Error subiendo fotos a solicitud ${solicitudId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Eliminar una foto de una solicitud
   */
  async deleteFoto(
    solicitudId: string,
    fotoUrl: string,
    userId: string,
    userRole: RolUsuario,
  ) {
    const solicitud = await this.findOne(solicitudId, userId, userRole);

    if (!solicitud.fotos || !solicitud.fotos.includes(fotoUrl)) {
      throw new NotFoundException('Foto no encontrada en esta solicitud');
    }

    try {
      const publicId = this.filesService.extractPublicId(fotoUrl);
      if (publicId) {
        await this.filesService.deleteFile(publicId, 'image');
      }

      const fotosActualizadas = solicitud.fotos.filter((f) => f !== fotoUrl);

      return this.prisma.solicitudAuxilio.update({
        where: { id: solicitudId },
        data: { fotos: fotosActualizadas },
      });
    } catch (error) {
      this.logger.error(
        `Error eliminando foto de solicitud ${solicitudId}:`,
        error,
      );
      throw error;
    }
  }
}

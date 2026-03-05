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
import { AceptarSolicitudDto } from './dto/aceptar-solicitud.dto';
import { GeocodingService } from '../geocoding/geocoding.service';
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
    private geocodingService: GeocodingService,
  ) {}

  async create(dto: CreateSolicitudDto, userId: string) {
    let { latitud, longitud } = dto;

    if (latitud === undefined || longitud === undefined) {
      this.logger.log(`Coordenadas ausentes para la dirección: ${dto.direccion}. Intentando geocodificación...`);
      const coords = await this.geocodingService.addressToCoords(dto.direccion);
      latitud = coords.latitud;
      longitud = coords.longitud;
    }

    if (
      typeof latitud !== 'number' ||
      latitud < -90 ||
      latitud > 90 ||
      typeof longitud !== 'number' ||
      longitud < -180 ||
      longitud > 180
    ) {
      throw new BadRequestException(
        'Coordenadas de ubicación inválidas. Latitud debe estar entre -90 y 90, longitud entre -180 y 180.',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario || !usuario.empresaId) {
      throw new ForbiddenException('Solo usuarios de empresa cliente pueden crear solicitudes');
    }

    const vehiculo = await this.prisma.vehiculo.findUnique({
      where: { id: dto.vehiculoId },
    });

    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');
    if (vehiculo.empresaId !== usuario.empresaId) {
      throw new ForbiddenException('El vehículo no pertenece a tu empresa');
    }

    const numero = `SOL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    return this.prisma.solicitudAuxilio.create({
      data: {
        numero,
        tipo: dto.tipo,
        prioridad: dto.prioridad ?? 'MEDIA',
        latitud: latitud.toString(),
        longitud: longitud.toString(),
        direccion: dto.direccion,
        observaciones: dto.observaciones,
        vehiculoId: dto.vehiculoId,
        empresaId: usuario.empresaId,
        solicitadoPorId: userId,
        estado: EstadoSolicitud.PENDIENTE,
      },
      include: {
        vehiculo: true,
        empresa: true,
        solicitadoPor: { select: { id: true, nombre: true, apellido: true } },
      },
    });
  }

  async findAll(query: QuerySolicitudDto, userId: string, userRole: RolUsuario) {
    const { page = 1, limit = 50, estado, tipo, vehiculoId, empresaId, proveedorId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SolicitudAuxilioWhereInput = {};

    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (vehiculoId) where.vehiculoId = vehiculoId;

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) throw new ForbiddenException('Usuario no válido');

    if (
      userRole === RolUsuario.CLIENTE_ADMIN ||
      userRole === RolUsuario.CLIENTE_OPERADOR
    ) {
      if (usuario.empresaId) where.empresaId = usuario.empresaId;
    } else if (
      userRole === RolUsuario.PROVEEDOR_ADMIN ||
      userRole === RolUsuario.PROVEEDOR_OPERADOR
    ) {
      // Modelo Marketplace: Ven lo asignado a ellos O lo que está PENDIENTE
      where.OR = [
        { proveedorId: usuario.proveedorId },
        { estado: EstadoSolicitud.PENDIENTE },
      ];
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
          atendidoPor: { select: { id: true, nombre: true, apellido: true } },
          vehiculoProveedor: { select: { id: true, patente: true, marca: true, modelo: true } },
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
      throw new BadRequestException('Solo solicitudes pendientes pueden asignarse');
    }

    const vehiculoCliente = await this.prisma.vehiculo.findUnique({
      where: { id: solicitud.vehiculoId },
    });

    if (!vehiculoCliente) throw new NotFoundException('Vehículo cliente no encontrado');

    // 1. Validar proveedor
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: dto.proveedorId },
    });

    if (!proveedor || !proveedor.isActive) {
      throw new NotFoundException('Proveedor no encontrado o inactivo');
    }

    // 2. Buscar operador disponible
    const operadorDisponible = await this.prisma.usuario.findFirst({
      where: {
        proveedorId: dto.proveedorId,
        rol: RolUsuario.PROVEEDOR_OPERADOR,
        estadoDisponibilidad: EstadoDisponibilidad.DISPONIBLE,
        isActive: true,
      },
    });

    // 3. Si viene vehiculoProveedorId específico, validarlo
    let vehiculoProveedorIdFinal = dto.vehiculoProveedorId;

    if (vehiculoProveedorIdFinal) {
      const vehiculoProv = await this.prisma.vehiculoProveedor.findUnique({
        where: { id: vehiculoProveedorIdFinal },
      });
      if (!vehiculoProv || vehiculoProv.proveedorId !== dto.proveedorId) {
        throw new BadRequestException('El vehículo asignado no pertenece al proveedor seleccionado.');
      }
    }

    // 4. Determinar operador a asignar
    const operadorAsignado = operadorDisponible;
    if (!operadorAsignado) {
      throw new BadRequestException('No hay operadores disponibles en el proveedor seleccionado.');
    }

    // 5. Auto-asignar vehículo del operador si no se especifica manualmente
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

    // 7. Marcar operador como ocupado
    await this.prisma.usuario.update({
      where: { id: operadorAsignado.id },
      data: { estadoDisponibilidad: EstadoDisponibilidad.OCUPADO },
    });

    return updated;
  }

  /**
   * Permite que un proveedor tome una solicitud del marketplace (PENDIENTE)
   */
  async aceptarMarketplace(id: string, dto: AceptarSolicitudDto, userId: string) {
    const usuarioSolicitante = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { proveedor: true },
    });

    if (!usuarioSolicitante || !usuarioSolicitante.proveedorId) {
      throw new ForbiddenException(
        'Solo los usuarios pertenecientes a un proveedor pueden aceptar solicitudes.',
      );
    }

    const solicitud = await this.prisma.solicitudAuxilio.findUnique({
      where: { id },
      include: { vehiculo: true },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException(
        'Esta solicitud ya no está disponible para ser aceptada.',
      );
    }

    // 1. Determinar operador responsable
    const atendidoPorId = dto.operadorId || userId;

    const operadorData = dto.operadorId
      ? await this.prisma.usuario.findUnique({ where: { id: dto.operadorId } })
      : usuarioSolicitante;

    if (!operadorData || operadorData.proveedorId !== usuarioSolicitante.proveedorId) {
      throw new BadRequestException('El operador responsable no existe o no pertenece a tu empresa.');
    }

    // 2. Validar vehículo o usar el habitual del operador
    const vehiculoProveedorId = dto.vehiculoProveedorId || operadorData.vehiculoProveedorId;

    if (vehiculoProveedorId) {
      const vehiculoProv = await this.prisma.vehiculoProveedor.findUnique({
        where: { id: vehiculoProveedorId },
      });

      if (!vehiculoProv || vehiculoProv.proveedorId !== usuarioSolicitante.proveedorId) {
        throw new BadRequestException('El vehículo asignado no pertenece a tu empresa.');
      }

      // 3. Validar compatibilidad vehículo-auxilio
      if (solicitud.vehiculo) {
        switch (solicitud.tipo) {
          case TipoAuxilio.GRUA:
            if (solicitud.vehiculo.tipo === TipoVehiculo.CAMION) {
              if (!vehiculoProv.tipos.includes(TipoVehiculoProveedor.GRUA_PESADA_CAMIONES)) {
                throw new BadRequestException('Para camiones se requiere una grúa pesada.');
              }
            } else {
              if (
                !vehiculoProv.tipos.includes(TipoVehiculoProveedor.REMOLQUE) &&
                !vehiculoProv.tipos.includes(TipoVehiculoProveedor.GRUA_PESADA_CAMIONES)
              ) {
                throw new BadRequestException('El vehículo seleccionado no es apto para remolque.');
              }
            }
            break;

          case TipoAuxilio.CAMBIO_RUEDA:
          case TipoAuxilio.BATERIA:
            if (
              !vehiculoProv.tipos.includes(TipoVehiculoProveedor.MECANICA) &&
              !vehiculoProv.tipos.includes(TipoVehiculoProveedor.GOMERIA_NEUMATICOS) &&
              !vehiculoProv.tipos.includes(TipoVehiculoProveedor.OTRO)
            ) {
              throw new BadRequestException('El vehículo seleccionado no es apto para este tipo de auxilio.');
            }
            break;

          case TipoAuxilio.CERRAJERIA:
            if (!vehiculoProv.tipos.includes(TipoVehiculoProveedor.CERRAJERIA)) {
              throw new BadRequestException('El vehículo seleccionado no es apto para cerrajería.');
            }
            break;

          case TipoAuxilio.COMBUSTIBLE:
            if (
              !vehiculoProv.tipos.includes(TipoVehiculoProveedor.MECANICA) &&
              !vehiculoProv.tipos.includes(TipoVehiculoProveedor.OTRO)
            ) {
              throw new BadRequestException('El vehículo seleccionado no es apto para traslado de combustible.');
            }
            break;

          default:
            break;
        }
      }
    }

    // Actualizar solicitud: asignar proveedor, responsable e inicio
    const updated = await this.prisma.solicitudAuxilio.update({
      where: { id },
      data: {
        proveedorId: usuarioSolicitante.proveedorId,
        atendidoPorId: atendidoPorId,
        vehiculoProveedorId: vehiculoProveedorId,
        estado: EstadoSolicitud.ASIGNADO,
        fechaAsignacion: new Date(),
      },
      include: {
        proveedor: true,
        empresa: true,
        vehiculo: true,
        atendidoPor: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    this.logger.log(
      `Solicitud ${id} aceptada por proveedor ${usuarioSolicitante.proveedor?.razonSocial || 'Desconocido'} y asignada a ${atendidoPorId}`,
    );

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
      if (!solicitud.atendidoPorId) {
        updateData.atendidoPor = { connect: { id: userId } };
      }
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
    const solicitud = await this.findOne(solicitudId, userId, RolUsuario.SUPER_ADMIN);

    const recursos = await this.prisma.vehiculoProveedor.findMany({
      where: {
        proveedor: { isActive: true },
        isActive: true,
        estado: EstadoVehiculo.ACTIVO,
      },
      include: {
        proveedor: { select: { id: true, razonSocial: true } },
      },
      orderBy: { marca: 'asc' },
    });

    const compatibles = recursos.filter((r) => {
      if (
        solicitud.tipo === TipoAuxilio.GRUA &&
        solicitud.vehiculo.tipo === TipoVehiculo.CAMION
      ) {
        return r.tipos.includes(TipoVehiculoProveedor.GRUA_PESADA_CAMIONES);
      }
      return true;
    });

    return compatibles;
  }

  async finalizar(id: string, dto: FinalizarSolicitudDto, userId: string, userRole: RolUsuario) {
    const solicitud = await this.findOne(id, userId, userRole);

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

  // ✅ FIX: calificar ahora recibe userRole para distinguir permisos
  //   - CLIENTE_ADMIN: puede calificar cualquier solicitud de su empresa
  //   - CLIENTE_OPERADOR: solo puede calificar la que él mismo creó (solicitadoPorId === userId)
  async calificar(id: string, dto: CalificarSolicitudDto, userId: string, userRole: RolUsuario) {
    const solicitud = await this.findOne(id, userId, userRole);

    if (solicitud.estado !== EstadoSolicitud.FINALIZADO) {
      throw new BadRequestException('Solo se pueden calificar servicios finalizados');
    }

    if (solicitud.calificacion) {
      throw new BadRequestException('Este servicio ya fue calificado');
    }

    // CLIENTE_OPERADOR solo puede calificar si fue quien creó la solicitud
    if (
      userRole === RolUsuario.CLIENTE_OPERADOR &&
      solicitud.solicitadoPorId !== userId
    ) {
      throw new ForbiddenException(
        'Solo el operador que generó la solicitud puede calificar este servicio',
      );
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
      // Puede acceder si está asignada a su proveedor O si está PENDIENTE (marketplace)
      if (
        solicitud.proveedorId !== usuario.proveedorId &&
        solicitud.estado !== EstadoSolicitud.PENDIENTE
      ) {
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
      this.logger.error(`Error subiendo fotos a solicitud ${solicitudId}:`, error);
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
      this.logger.error(`Error eliminando foto de solicitud ${solicitudId}:`, error);
      throw error;
    }
  }
}

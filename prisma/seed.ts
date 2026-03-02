import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Limpiar datos previos (opcional — uso en desarrollo)
    await prisma.solicitudAuxilio.deleteMany();
    await prisma.vehiculoProveedor.deleteMany();
    await prisma.vehiculo.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.proveedor.deleteMany();
    await prisma.empresa.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.refreshToken.deleteMany();

    const hashedPass = await bcrypt.hash('password123', 12);

    // Planes
    await prisma.plan.createMany({
        data: [
            {
                id: 'plan-1',
                nombre: 'Básico',
                descripcion: 'Plan gratuito con funciones limitadas',
                serviciosIncluidos: ['Dashboard básico', 'Soporte por email'],
                precioMensual: '0.00',
                isActive: true,
            },
            {
                id: 'plan-2',
                nombre: 'Pro',
                descripcion: 'Plan con integraciones y reportes avanzados',
                serviciosIncluidos: ['Integraciones webhooks', 'Reportes avanzados', 'Soporte telefónico'],
                precioMensual: '4990.00',
                isActive: true,
            },
        ],
    });

    // Empresas
    await prisma.empresa.createMany({
        data: [
            {
                id: 'e-1',
                razonSocial: 'Transporte SA',
                cuit: '30-12345678-9',
                telefono: '+5491166666666',
                email: 'contacto@transportesa.com',
                direccion: 'Av. Siempre Viva 123',
                planId: 'plan-2',
                isActive: true,
            },
            {
                id: 'e-2',
                razonSocial: 'Comercio XYZ',
                cuit: '30-87654321-0',
                telefono: '+5491177777777',
                email: 'info@comercioxyz.com',
                direccion: 'Calle Falsa 456',
                planId: 'plan-1',
                isActive: true,
            },
        ],
    });

    // Proveedores
    await prisma.proveedor.createMany({
        data: [
            {
                id: 'p-1',
                razonSocial: 'Auxilio Rápido',
                cuit: '20-11111111-1',
                email: 'contacto@auxiliorapido.com',
                telefono: '+5491188888888',
                direccion: 'Ruta 3 km 12',
                serviciosOfrecidos: ['MECANICO', 'GRUA', 'BATERIA'],
                zonasCobertura: JSON.stringify({ cities: ['Buenos Aires'], radiusKm: 40 }),
                calificacionPromedio: '4.60',
                isActive: true,
            },
            {
                id: 'p-2',
                razonSocial: 'Asistencia Norte',
                cuit: '20-22222222-2',
                email: 'hola@asistencianorte.com',
                telefono: '+5491199999999',
                direccion: 'Boulevard Norte 77',
                serviciosOfrecidos: ['GRUA', 'MECANICO'],
                zonasCobertura: JSON.stringify({ cities: ['Rosario'], radiusKm: 25 }),
                calificacionPromedio: '4.20',
                isActive: true,
            },
        ],
    });

    // Vehículos de empresa (para solicitudes)
    await prisma.vehiculo.createMany({
        data: [
            {
                id: 'veh-e1-1',
                patente: 'CUST-100',
                marca: 'Fiat',
                modelo: 'Ducato',
                año: 2018,
                tipo: 'CAMION',
                empresaId: 'e-1',
                isActive: true,
            },
        ],
    });

    // Vehículos de proveedores
    await prisma.vehiculoProveedor.createMany({
        data: [
            {
                id: 'vp-1',
                patente: 'ABC123',
                marca: 'Fiat',
                modelo: 'Ducato',
                año: 2018,
                tipos: ['OTRO'],
                capacidadKg: 1500,
                proveedorId: 'p-1',
                isActive: true,
            },
            {
                id: 'vp-2',
                patente: 'XYZ789',
                marca: 'Ford',
                modelo: 'Transit',
                año: 2020,
                tipos: ['REMOLQUE'],
                capacidadKg: 2500,
                proveedorId: 'p-1',
                isActive: true,
            },
        ],
    });

    // Usuarios
    await prisma.usuario.createMany({
        data: [
            {
                id: 'u-1',
                nombre: 'Admin Global',
                apellido: 'Sistema',
                email: 'admin@auxy.com',
                password: hashedPass,
                telefono: '+5491111111111',
                rol: 'SUPER_ADMIN',
                isActive: true,
            },
            {
                id: 'u-2',
                nombre: 'Cliente Admin 1',
                apellido: 'Empresa',
                email: 'cliente.admin1@empresa.com',
                password: hashedPass,
                telefono: '+5491122222222',
                rol: 'CLIENTE_ADMIN',
                isActive: true,
                empresaId: 'e-1',
            },
            {
                id: 'u-3',
                nombre: 'Cliente Operador',
                apellido: 'Operador',
                email: 'cliente.operador@empresa.com',
                password: hashedPass,
                telefono: '+5491133333333',
                rol: 'CLIENTE_OPERADOR',
                isActive: true,
                empresaId: 'e-1',
            },
            {
                id: 'u-4',
                nombre: 'Proveedor Admin',
                apellido: 'Proveedor',
                email: 'prov.admin@proveedor.com',
                password: hashedPass,
                telefono: '+5491144444444',
                rol: 'PROVEEDOR_ADMIN',
                isActive: true,
                proveedorId: 'p-1',
            },
            {
                id: 'u-5',
                nombre: 'Proveedor Operador',
                apellido: 'Operador',
                email: 'prov.operador@proveedor.com',
                password: hashedPass,
                telefono: '+5491155555555',
                rol: 'PROVEEDOR_OPERADOR',
                isActive: true,
                proveedorId: 'p-1',
                estadoDisponibilidad: 'DISPONIBLE',
            },
        ],
    });

    // Solicitudes
    await prisma.solicitudAuxilio.createMany({
        data: [
            {
                id: 's-1',
                numero: 'SOL-20260223-001',
                tipo: 'MECANICO',
                estado: 'PENDIENTE',
                prioridad: 'ALTA',
                latitud: '-34.60370000',
                longitud: '-58.38160000',
                direccion: 'Av. Siempre Viva 500',
                observaciones: 'Camión con desperfecto en caja de cambios',
                empresaId: 'e-1',
                vehiculoId: 'veh-e1-1',
                proveedorId: null,
                solicitadoPorId: 'u-3',
                isActive: true,
            },
            {
                id: 's-2',
                numero: 'SOL-20260220-045',
                tipo: 'GRUA',
                estado: 'FINALIZADO',
                prioridad: 'MEDIA',
                latitud: '-31.42010000',
                longitud: '-64.18880000',
                direccion: 'Calle Falsa 456',
                observaciones: 'Vehículo sin batería',
                empresaId: 'e-2',
                vehiculoId: 'veh-e1-1',
                proveedorId: 'p-2',
                solicitadoPorId: 'u-2',
                atendidoPorId: 'u-5',
                calificacion: 5,
                comentarioCliente: 'Servicio rápido y profesional',
                fechaFinalizacion: new Date('2026-02-20T13:00:00Z'),
                isActive: true,
            },
        ],
    });

    console.log('Seed completado con datos de ejemplo');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // Limpiar datos previos (opcional, solo para dev)
    await prisma.solicitudAuxilio.deleteMany();
    await prisma.vehiculoProveedor.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.proveedor.deleteMany();
    await prisma.empresa.deleteMany();

    // 1. Crear Empresa Cliente de prueba
    const empresaCliente = await prisma.empresa.create({
        data: {
        razonSocial: 'Logística Montevideo S.A.',
        cuit: '210123456789',
        telefono: '+598 99 111 222',
        email: 'contacto@logistica.uy',
        direccion: 'Av. Italia 1234, Montevideo',
        },
    });

    // 2. Crear Proveedor de asistencia
    const proveedor = await prisma.proveedor.create({
        data: {
        razonSocial: 'Grúas Rápidas SRL',
        cuit: '211987654321',
        email: 'info@gruasrapidas.uy',
        telefono: '+598 98 777 888',
        direccion: 'Ruta 8 km 15',
        serviciosOfrecidos: ['GRUA', 'MECANICO', 'BATERIA'],
        zonasCobertura: { type: 'Polygon', coordinates: [[[ -56.0, -34.9 ], [ -56.1, -34.8 ], [ -56.2, -34.9 ]]] },
        calificacionPromedio: 4.5,
        },
    });

    // 3. Usuarios Cliente
    const hashedPass = await bcrypt.hash('password123', 12);

    await prisma.usuario.createMany({
        data: [
        {
            email: 'admin@logistica.uy',
            password: hashedPass,
            nombre: 'Ana',
            apellido: 'Gómez',
            telefono: '+598 99 123 456',
            rol: 'CLIENTE_ADMIN',
            empresaId: empresaCliente.id,
        },
        {
            email: 'chofer@logistica.uy',
            password: hashedPass,
            nombre: 'Carlos',
            apellido: 'Pérez',
            telefono: '+598 98 654 321',
            rol: 'CLIENTE_OPERADOR',
            empresaId: empresaCliente.id,
        },
        ],
    });

    // 4. Usuarios Proveedor
    const proveedorAdmin = await prisma.usuario.create({
        data: {
        email: 'gerente@gruasrapidas.uy',
        password: hashedPass,
        nombre: 'Diego',
        apellido: 'Rodríguez',
        telefono: '+598 97 111 222',
        rol: 'PROVEEDOR_ADMIN',
        proveedorId: proveedor.id,
        },
    });

    const proveedorOperador = await prisma.usuario.create({
        data: {
        email: 'chofer1@gruasrapidas.uy',
        password: hashedPass,
        nombre: 'Eduardo',
        apellido: 'Martínez',
        telefono: '+598 96 333 444',
        rol: 'PROVEEDOR_OPERADOR',
        proveedorId: proveedor.id,
        estadoDisponibilidad: 'DISPONIBLE',
        ultimaUbicacion: { lat: -34.9011, lng: -56.1645, updatedAt: new Date() },
        },
    });

    // 5. Vehículo Cliente
    await prisma.vehiculo.create({
        data: {
        patente: 'ABC1234',
        marca: 'Mercedes',
        modelo: 'Actros',
        año: 2018,
        tipo: 'CAMION',
        empresaId: empresaCliente.id,
        },
    });

    // 6. Vehículo Proveedor (grúa pesada)
    await prisma.vehiculoProveedor.create({
        data: {
        patente: 'GRU001A',
        marca: 'Volvo',
        modelo: 'FH16',
        año: 2020,
        tipo: 'GRUA_PESADA',
        capacidadKg: 12000,
        proveedorId: proveedor.id,
        },
    });

    console.log('Seed completado con datos B2B de prueba');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
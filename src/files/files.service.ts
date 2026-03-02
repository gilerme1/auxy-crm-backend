/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
    Injectable,
    BadRequestException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import type { Multer } from 'multer';

export interface CloudinaryUploadOptions {
    folder?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    publicId?: string;
    width?: number;
    height?: number;
    crop?: string;
    allowedExtensions?: string[];
    maxFileSize?: number; // en bytes
}

@Injectable()
export class FilesService {
    private readonly logger = new Logger(FilesService.name);
    private readonly maxFileSize = 5 * 1024 * 1024; // 5MB default
    private readonly allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    private readonly allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx'];

    constructor(private configService: ConfigService) {
        // Configurar Cloudinary
        cloudinary.config({
        cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
        api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
        api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });
    }

    /**
     * Subir un archivo a Cloudinary
     * @param file - Express MulterFile
     * @param options - Opciones de upload
     * @returns UploadApiResponse con URL y metadata
     */
    async uploadFile(
        file: Multer.File,
        options: CloudinaryUploadOptions = {},
    ): Promise<UploadApiResponse> {
        try {
        // Validar archivo
        this.validateFile(file, options);

        const stream = require('stream');
        const uploadStream = cloudinary.uploader.upload_stream(
            {
            folder: options.folder || 'auxy',
            resource_type: options.resourceType || 'auto',
            public_id: options.publicId,
            ...(options.width && {
                width: options.width,
                height: options.height || options.width,
                crop: options.crop || 'thumb',
            }),
            },
            (error: UploadApiErrorResponse, result: UploadApiResponse) => {
            if (error) {
                this.logger.error('Error uploading to Cloudinary:', error);
                throw new InternalServerErrorException(
                'Error al subir archivo a Cloudinary',
                );
            }
            return result;
            },
        );

        // Subir el buffer del archivo
        const bufferStream = stream.Readable.from(file.buffer);
        return new Promise((resolve, reject) => {
            bufferStream.pipe(uploadStream);
            uploadStream.on('finish', (result: UploadApiResponse) => {
            resolve(result);
            });
            uploadStream.on('error', (error: Error) => {
            reject(error);
            });
        });
        } catch (error) {
        this.logger.error('Error en uploadFile:', error);
        throw error;
        }
    }

    /**
     * Subir múltiples archivos
     */
    async uploadMultiple(
        files: Multer.File[],
        options: CloudinaryUploadOptions = {},
    ): Promise<UploadApiResponse[]> {
        try {
        const uploadPromises = files.map((file) =>
            this.uploadFile(file, options),
        );
        return await Promise.all(uploadPromises);
        } catch (error) {
        this.logger.error('Error en uploadMultiple:', error);
        throw error;
        }
    }

    /**
     * Eliminar archivo de Cloudinary
     */
    async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
        try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        this.logger.log(`Archivo eliminado: ${publicId}`);
        } catch (error) {
        this.logger.error(`Error eliminando archivo ${publicId}:`, error);
        throw new InternalServerErrorException('Error al eliminar archivo');
        }
    }

    /**
     * Eliminar múltiples archivos por publicId
     */
    async deleteMultiple(
        publicIds: string[],
        resourceType: 'image' | 'video' | 'raw' = 'image',
    ): Promise<void> {
        try {
        const deletePromises = publicIds.map((id) =>
            cloudinary.uploader.destroy(id, { resource_type: resourceType }),
        );
        await Promise.all(deletePromises);
        this.logger.log(`Archivos eliminados: ${publicIds.join(', ')}`);
        } catch (error) {
        this.logger.error('Error eliminando múltiples archivos:', error);
        throw new InternalServerErrorException(
            'Error al eliminar archivos',
        );
        }
    }

    /**
     * Extraer publicId de una URL de Cloudinary
     */
    extractPublicId(url: string): string | null {
        const matches = url.match(/\/v\d+\/(.+?)\.\w+$/);
        return matches ? matches[1] : null;
    }

    /**
     * Generar URL de versión optimizada
     */
    getOptimizedUrl(
        url: string,
        options: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string;
        format?: string;
        } = {},
    ): string {
        // Usar transformación de Cloudinary directamente en la URL
        const width = options.width ? `w_${options.width}` : '';
        const height = options.height ? `h_${options.height}` : '';
        const crop = options.crop ? `c_${options.crop}` : '';
        const quality = options.quality ? `q_${options.quality}` : '';
        const format = options.format ? `f_${options.format}` : '';

        const transformation = [width, height, crop, quality, format]
        .filter(Boolean)
        .join(',');

        if (!transformation) return url;

        // Insertar transformación en la URL
        return url.replace(/\/upload\//, `/upload/${transformation}/`);
    }
    /**
     * Validar archivo antes de subirlo
     */
    private validateFile(
        file: Multer.File,
        options: CloudinaryUploadOptions = {},
    ): void {
        if (!file) {
        throw new BadRequestException('No se proporcionó archivo');
        }

        const maxSize = options.maxFileSize || this.maxFileSize;
        const allowedExts =
        options.allowedExtensions || this.allowedImageExtensions;

        // Validar tamaño
        if (file.size > maxSize) {
        throw new BadRequestException(
            `Archivo demasiado grande. Máximo: ${maxSize / 1024 / 1024}MB`,
        );
        }

        // Validar extensión
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (!ext || !allowedExts.includes(ext)) {
        throw new BadRequestException(
            `Tipo de archivo no permitido. Permitidos: ${allowedExts.join(', ')}`,
        );
        }

        // Validar MIME type
        if (!file.mimetype.startsWith('image/') && !file.mimetype.includes('pdf')) {
        throw new BadRequestException('Archivo debe ser imagen o PDF');
        }
    }
}

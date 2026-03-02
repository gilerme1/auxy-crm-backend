/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Controller,
    Post,
    Delete,
    Body,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    Param,
    BadRequestException,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiConsumes,
    ApiBody,
    ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Multer } from 'multer';
import { FilesService } from './files.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Files - Uploads')
@Controller('files')
export class FilesController {
    constructor(private filesService: FilesService) {}

    @Post('upload/image')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Subir una imagen' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
        type: 'object',
        properties: {
            file: {
            type: 'string',
            format: 'binary',
            },
            folder: {
            type: 'string',
            description: 'Carpeta en Cloudinary (ej: solicitudes, usuarios)',
            },
        },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        }),
    )
    async uploadImage(
        @UploadedFile() file: Multer.File,
        @Body('folder') folder?: string,
    ) {
        if (!file) {
        throw new BadRequestException('No file provided');
        }

        const result = await this.filesService.uploadFile(file, {
        folder: folder || 'auxy/images',
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        });

        return {
        success: true,
        data: {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            size: result.bytes,
        },
        };
    }

    @Post('upload/multiple')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Subir múltiples imágenes' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
        type: 'object',
        properties: {
            files: {
            type: 'array',
            items: {
                type: 'string',
                format: 'binary',
            },
            },
            folder: {
            type: 'string',
            },
        },
        },
    })
    @UseInterceptors(
        FilesInterceptor('files', 10, {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
        }),
    )
    async uploadMultiple(
        @UploadedFiles() files: Multer.File[],
        @Body('folder') folder?: string,
    ) {
        if (!files || files.length === 0) {
        throw new BadRequestException('No files provided');
        }

        const results = await this.filesService.uploadMultiple(files, {
        folder: folder || 'auxy/images',
        });

        return {
        success: true,
        data: results.map((r) => ({
            url: r.secure_url,
            publicId: r.public_id,
            width: r.width,
            height: r.height,
        })),
        };
    }

    @Delete(':publicId')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Eliminar archivo por publicId' })
    @ApiParam({ name: 'publicId', description: 'Public ID de Cloudinary' })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteFile(
        @Param('publicId') publicId: string,
    ): Promise<void> {
        await this.filesService.deleteFile(publicId);
    }

    @Post('delete/multiple')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Eliminar múltiples archivos' })
    @ApiBody({
        schema: {
        type: 'object',
        properties: {
            publicIds: {
            type: 'array',
            items: { type: 'string' },
            },
        },
        },
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMultiple(
        @Body('publicIds') publicIds: string[],
    ): Promise<void> {
        if (!publicIds || publicIds.length === 0) {
        throw new BadRequestException('No public IDs provided');
        }
        await this.filesService.deleteMultiple(publicIds);
    }
}

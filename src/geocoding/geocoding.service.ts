import { Injectable, Logger, BadRequestException } from '@nestjs/common';

interface PhotonResponse {
    features: Array<{
        geometry: {
        coordinates: [number, number];
        };
        properties: {
        label?: string;
        name?: string;
        };
    }>;
}

@Injectable()
export class GeocodingService {
    private readonly logger = new Logger(GeocodingService.name);
    private readonly PHOTON_URL = 'https://photon.komoot.io/api/';

    /**
     * Convierte una dirección de texto en coordenadas (latitud y longitud)
     * usando la API de Photon (OSM).
     */
    async addressToCoords(direccion: string): Promise<{ latitud: number; longitud: number }> {
        try {
        this.logger.log(`Geocodificando dirección: ${direccion}`);
        
        const url = new URL(this.PHOTON_URL);
        url.searchParams.append('q', direccion);
        url.searchParams.append('limit', '1');
        url.searchParams.append('lang', 'es');
        
        // Priorizar resultados en un área aproximada de Argentina
        // para evitar confusiones con otros países.
        // bbox format: minLon, minLat, maxLon, maxLat
        // Argentina aprox: -73, -55, -53, -22
        url.searchParams.append('bbox', '-73.5,-55.0,-53.5,-21.8');

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`Photon API respondió con status: ${response.status}`);
        }

        const data = (await response.json()) as PhotonResponse;

        if (!data.features || data.features.length === 0) {
            this.logger.warn(`No se encontraron coordenadas para: ${direccion}`);
            throw new BadRequestException('No se pudo encontrar la ubicación para la dirección proporcionada.');
        }

        // Photon devuelve [longitud, latitud] en el array de coordenadas
        const [longitud, latitud] = data.features[0].geometry.coordinates;

        return { latitud, longitud };
        } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        this.logger.error(`Error en geocodificación: ${errorMessage}`);
        if (error instanceof BadRequestException) throw error;
        throw new Error('Servicio de geocodificación no disponible temporalmente.');
        }
    }

    /**
     * (Opcional) Convierte coordenadas en una dirección legible
     */
    coordsToAddress(): Promise<string> {
        // Nota: Photon no es tan bueno para reverse geocoding, 
        // para esto Nominatim suele ser mejor:
        // https://nominatim.openstreetmap.org/reverse?lat=<lat>&lon=<lon>&format=json
        return Promise.resolve("Dirección no implementada aún");
    }
}

/*
Script de importación: lee un CSV y lo inserta en la colección "avistamientos".
*/

'use strict';

const path = require('path');

const DEBUG = process.env.DEBUG_IMPORT === '1';

// Utilidades de normalización y transformación
function stripDiacritics(value) {
    return typeof value === 'string'
        ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        : value;
}

function normalizeKey(key) {
    if (typeof key !== 'string') return key;
    const noDiacritics = stripDiacritics(key);
    return noDiacritics
        .toLowerCase()
        .replace(/\s+|_|-/g, '')
        .trim();
}

function toNumberOrUndefined(value) {
    if (value == null || value === '') return undefined;
    const n = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
    if (DEBUG) console.log('[num]', value, '=>', Number.isFinite(n) ? n : 'invalid');
    return Number.isFinite(n) ? n : undefined;
}

function toDateOrUndefined(value) {
    if (value == null || value === '') return undefined;
    const d = new Date(value);
    if (DEBUG) console.log('[date]', value, '=>', Number.isFinite(d.getTime()) ? d.toISOString() : 'invalid');
    return Number.isFinite(d.getTime()) ? d : undefined;
}

// Transforma una fila cruda del CSV a un documento acorde al esquema
function transformRow(rawRow) {
    const normalized = {};
    for (const [k, v] of Object.entries(rawRow)) {
        const nk = normalizeKey(k);
        normalized[nk] = typeof v === 'string' ? v.trim() : v;
    }

    // Sinónimos por campo (normalizados)
    const synonyms = {
        reino: ['reino', 'kingdom'],
        filo: ['filo', 'phylum'],
        clase: ['clase', 'class'],
        orden: ['orden', 'order'],
        familia: ['familia', 'family'],
        genero: ['genero', 'genus'],
        especie: ['especie', 'species'],
        pais: ['pais', 'country', 'countrycode'],
        latitud: ['latitud', 'latitude', 'decimallatitude', 'lat', 'y'],
        longitud: ['longitud', 'longitude', 'decimallongitude', 'lon', 'long', 'x'],
        fechaevento: ['fechaevento', 'fecha', 'eventdate', 'date', 'fecharegistro'],
        nombrecientifico: ['nombrecientifico', 'scientificname', 'nombre', 'name'],
    };

    function getValue(key) {
        const list = synonyms[key] || [key];
        for (const variant of list) {
            if (normalized[variant] != null && normalized[variant] !== '') return normalized[variant];
        }
        return undefined;
    }

    let fechaRaw = getValue('fechaevento');
    if (!fechaRaw) {
        const year = normalized.year;
        const month = normalized.month; // 1-12
        const day = normalized.day;
        if (year && month && day) {
            const m = String(month).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            fechaRaw = `${year}-${m}-${d}`;
        }
    }

    const doc = {
        Taxonomia: {
            Reino: getValue('reino'),
            Filo: getValue('filo'),
            Clase: getValue('clase'),
            Orden: getValue('orden'),
            Familia: getValue('familia'),
            Genero: getValue('genero'),
            Especie: getValue('especie'),
        },
        Ubicacion: {
            Pais: getValue('pais'),
            Geolocalizacion: {
                Latitud: toNumberOrUndefined(getValue('latitud')),
                Longitud: toNumberOrUndefined(getValue('longitud')),
            },
        },
        FechaEvento: toDateOrUndefined(fechaRaw),
        NombreCientifico: getValue('nombrecientifico'),
    };
    return doc;
}

// Reglas simples para detectar si el doc está totalmente vacío
function isEffectivelyEmpty(doc) {
    const t = doc.Taxonomia || {};
    const u = doc.Ubicacion || {};
    const g = (u.Geolocalizacion || {});
    const taxonomyHas = [t.Reino, t.Filo, t.Clase, t.Orden, t.Familia, t.Genero, t.Especie]
        .some(v => v && String(v).length > 0);
    const ubicHas = (u.Pais && u.Pais.length > 0) || Number.isFinite(g.Latitud) || Number.isFinite(g.Longitud);
    const otherHas = !!doc.FechaEvento || (doc.NombreCientifico && doc.NombreCientifico.length > 0);
    return !(taxonomyHas || ubicHas || otherHas);
}

// Valida que el documento cumpla con el esquema requerido por Mongo (campos obligatorios)
function isValidAccordingToSchema(doc) {
    const t = doc?.Taxonomia;
    const u = doc?.Ubicacion;
    const g = u?.Geolocalizacion;

    const hasAllTax = t && [t.Reino, t.Filo, t.Clase, t.Orden, t.Familia, t.Genero, t.Especie]
        .every(v => typeof v === 'string' && v.length > 0);
    const hasUbic = u && typeof u.Pais === 'string' && u.Pais.length > 0;
    const hasGeo = g && Number.isFinite(g.Latitud) && Number.isFinite(g.Longitud);
    const hasFecha = doc?.FechaEvento instanceof Date && Number.isFinite(doc.FechaEvento.getTime());
    const hasNombre = typeof doc?.NombreCientifico === 'string' && doc.NombreCientifico.length > 0;

    return !!(hasAllTax && hasUbic && hasGeo && hasFecha && hasNombre);
}

async function readAndInsertData({ mongoose, Avistamiento, csvPath }) {
    const fs = require('fs');
    const csv = require('csv-parser');

    const separator = (process.env.CSV_SEPARATOR || ',');

    return new Promise((resolve, reject) => {
        let total = 0;
        let skipped = 0;
        let warnNoLatLon = 0;
        let warnBadDate = 0;
    let inserted = 0;
        const batch = [];
        const BATCH_SIZE = Number(process.env.BATCH_SIZE || 10000);
    let invalidRequired = 0;

        const stream = fs.createReadStream(csvPath);

        function flushBatch(final = false) {
            if (batch.length === 0) return Promise.resolve();
            const current = batch.splice(0, batch.length);
            return Avistamiento.insertMany(current, { ordered: false })
                .then(res => {
                    inserted += res.length;
                    if (!final) console.log(`Insertados acumulados: ${inserted}`);
                })
                .catch(err => {
                    console.error('Error en inserción por lotes:', err?.message || err);
                    if (err && err.writeErrors && err.writeErrors.length) {
                        console.error(`Errores de escritura en lote: ${err.writeErrors.length}`);
                    }
                });
        }

        stream.on('error', (err) => {
            console.error('Error al leer el CSV:', err.message);
            reject(err);
        });

        stream
            .pipe(csv({ separator, strict: false }))
            .on('data', (row) => {
                total += 1;
                const doc = transformRow(row);
                const lat = doc?.Ubicacion?.Geolocalizacion?.Latitud;
                const lon = doc?.Ubicacion?.Geolocalizacion?.Longitud;
                if (!Number.isFinite(lat) && !Number.isFinite(lon)) warnNoLatLon += 1;
                if (doc.FechaEvento == null) warnBadDate += 1;
                if (isEffectivelyEmpty(doc)) {
                    skipped += 1;
                    return;
                }
                if (!isValidAccordingToSchema(doc)) {
                    invalidRequired += 1;
                    skipped += 1;
                    return;
                }
                batch.push(doc);
                if (batch.length >= BATCH_SIZE) {
                    stream.pause();
                    flushBatch().finally(() => stream.resume());
                }
            })
            .on('end', async () => {
                try {
                    await flushBatch(true);
                    console.log(`CSV completamente leído. Filas: ${total}. Insertadas: ${inserted}. Omitidas: ${skipped}.`);
                    if (warnNoLatLon > 0) console.warn(`Advertencia: ${warnNoLatLon} fila(s) sin Latitud/Longitud válidas.`);
                    if (warnBadDate > 0) console.warn(`Advertencia: ${warnBadDate} fila(s) con FechaEvento inválida o ausente.`);
                    if (invalidRequired > 0) console.warn(`Omitidas por no cumplir esquema requerido: ${invalidRequired}.`);
                    resolve({ inserted, total, skipped });
                } catch (err) {
                    console.error('Error final al insertar lotes:', err?.message || err);
                    resolve({ inserted, total, skipped, error: err });
                }
            });
    });
}

async function main() {
    const mongoose = require('mongoose');

    // Construcción robusta de la URI con credenciales
    function buildMongoUri() {
        if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== '') {
            return process.env.MONGODB_URI.trim();
        }
        const baseUri = process.env.MONGO_URI; 
        const dbName = process.env.MONGO_DB;   
        if (baseUri && dbName) {
            const cleaned = baseUri.replace(/\/$/, '');
            const withDb = `${cleaned}/${dbName}`;
            // Añadir authSource si no está ya presente
            return /authSource=/.test(withDb) ? withDb : `${withDb}?authSource=admin`;
        }
        // Fallback local
        return 'mongodb://admin:123123@localhost:27017/biogeovis?authSource=admin';
    }

    function maskUri(uri) {
        try {
            const parsed = new URL(uri);
            if (parsed.password) parsed.password = '***';
            return parsed.toString();
        } catch {
            return uri.replace(/:(?:[^:@]+)@/, ':***@');
        }
    }

    const MONGODB_URI = buildMongoUri();
    const csvPath = process.env.CSV_PATH || path.resolve(__dirname, '../../csv/Avistamientos.csv');

    // Definimos el esquema aquí
    const AvistamientoSchema = new mongoose.Schema({
        Taxonomia: {
            Reino: String,
            Filo: String,
            Clase: String,
            Orden: String,
            Familia: String,
            Genero: String,
            Especie: String,
        },
        Ubicacion: {
            Pais: String,
            Geolocalizacion: {
                Latitud: Number,
                Longitud: Number,
            },
        },
        FechaEvento: Date,
        NombreCientifico: String,
    }, {
        collection: 'avistamientos',
        strict: true,
    });

    const Avistamiento = mongoose.model('Avistamiento', AvistamientoSchema);

    try {
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('Conexión a la base de datos establecida');
        console.log('URI destino (enmascarada):', maskUri(MONGODB_URI));
        const outcome = await readAndInsertData({ mongoose, Avistamiento, csvPath });
        return outcome;
    } catch (err) {
        console.error('Error de conexión a la base de datos:', err?.message || err);
        throw err;
    } finally {
        try {
            await mongoose.connection.close();
            console.log('Conexión a la base de datos cerrada');
        } catch (_) {}
    }
}

// Ejecutar sólo si este archivo es el punto de entrada
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

// Exportamos utilidades
module.exports = { transformRow, isEffectivelyEmpty, isValidAccordingToSchema };
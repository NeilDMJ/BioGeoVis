db = db.getSiblingDB("biogeovis");

// Esquema embebido para 'avistamientos' (eliminamos dependencias de archivos externos)
const avistamientosSchema = {
    bsonType: "object",
    required: ["Taxonomia", "Ubicacion", "FechaEvento", "NombreCientifico"],
    properties: {
        Taxonomia: {
            bsonType: "object",
            required: ["Reino", "Filo", "Clase", "Orden", "Familia", "Genero", "Especie"],
            properties: {
                Reino: { bsonType: "string" },
                Filo: { bsonType: "string" },
                Clase: { bsonType: "string" },
                Orden: { bsonType: "string" },
                Familia: { bsonType: "string" },
                Genero: { bsonType: "string" },
                Especie: { bsonType: "string" },
            },
        },
        Ubicacion: {
            bsonType: "object",
            required: ["Pais", "Geolocalizacion"],
            properties: {
                Pais: { bsonType: "string" },
                Geolocalizacion: {
                    bsonType: "object",
                    required: ["Latitud", "Longitud"],
                    properties: {
                        Latitud: { bsonType: "number" },
                        Longitud: { bsonType: "number" },
                    },
                },
            },
        },
        FechaEvento: { bsonType: "date", description: "Fecha del avistamiento" },
        NombreCientifico: { bsonType: "string" },
    },
};

const validator = { $jsonSchema: avistamientosSchema };

// Crear o actualizar la colección con el validador
if (!db.getCollectionNames().includes("avistamientos")) {
    db.createCollection("avistamientos", {
        validator: validator,
        validationLevel: "strict",
        validationAction: "error",
    });
} else {
    db.runCommand({
        collMod: "avistamientos",
        validator: validator,
        validationLevel: "strict",
        validationAction: "error",
    });
}

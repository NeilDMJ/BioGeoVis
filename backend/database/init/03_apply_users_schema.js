(() => {
    const dbName = 'biogeovis';
    const collName = 'users';
    
    // Esquema embebido para 'users' (eliminamos dependencias de archivos externos)
    var usersSchema = {
        bsonType: "object",
        required: ["username", "email", "hashed_password", "firstName", "lastName"],
        properties: {
            username: {
                bsonType: "string",
                description: "el campo 'username' es obligatorio y debe ser una cadena entre 3 y 20 caracteres",
                minLength: 3,
                maxLength: 20,
            },
            email: {
                bsonType: "string",
                description: "el campo 'email' es obligatorio y debe ser una cadena en formato de correo electrónico",
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            },
            hashed_password: {
                bsonType: "string",
                description: "el campo 'hashed_password' es obligatorio y debe ser una cadena (contraseña hasheada con bcrypt)",
                minLength: 20,
            },
            firstName: {
                bsonType: "string",
                description: "el campo 'firstName' es obligatorio y debe ser una cadena entre 2 y 50 caracteres",
                minLength: 2,
                maxLength: 50,
            },
            lastName: {
                bsonType: "string",
                description: "el campo 'lastName' es obligatorio y debe ser una cadena entre 2 y 50 caracteres",
                minLength: 2,
                maxLength: 50,
            },
            age: {
                bsonType: ["int", "null"],
                description: "el campo 'age' es opcional y debe ser un entero mayor o igual a 10, o null",
                minimum: 10,
            },
            registrationDate: {
                bsonType: ["date", "null"],
                description: "el campo 'registrationDate' es opcional y debe ser una fecha o null",
            },
            isActive: {
                bsonType: ["bool", "null"],
                description: "el campo 'isActive' es opcional y debe ser un booleano",
            },
            photo: {
                bsonType: ["string", "null"],
                description: "el campo 'photo' es opcional y debe ser una cadena en formato de URL o null",
                pattern: "^(https?|ftp)://[^\\s/$.?#].[^\\s]*$",
            },
        },
    };

    const targetDb = db.getSiblingDB(dbName);
    const exists = targetDb.getCollectionNames().includes(collName);

    if (!exists) {
        print(`Creando colección ${dbName}.${collName} con validador`);
        targetDb.createCollection(collName, {
            validator: { $jsonSchema: usersSchema },
            validationLevel: 'strict',
            validationAction: 'error',
        });
    } else {
        print(`Actualizando validador de ${dbName}.${collName}`);
        targetDb.runCommand({
            collMod: collName,
            validator: { $jsonSchema: usersSchema },
            validationLevel: 'strict',
            validationAction: 'error',
        });
    }

    // Asegurar visibilidad: insertar y eliminar un documento que cumpla el schema
    const _initDoc = {
        username: "__init_user__",
        email: "init@example.com",
        hashed_password: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.OYQa/",
        firstName: "Init",
        lastName: "User",
        isActive: true
    };
    targetDb[collName].insertOne(_initDoc);
    targetDb[collName].deleteOne({ username: _initDoc.username });

    print('Schema de users aplicado correctamente.');
})();
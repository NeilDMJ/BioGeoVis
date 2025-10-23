(() => {
    const dbName = 'biogeovis';
    const collName = 'users';
    
    // Esquema embebido para 'users' (eliminamos dependencias de archivos externos)
    var usersSchema = {
        bsonType: "object",
        required: ["username", "email", "password", "firstName", "lastName"],
        properties: {
            username: {
                bsonType: "string",
                description: "el campo 'username' es obligatorio y debe ser una cadena entre 5 y 20 caracteres",
                minLength: 5,
                maxLength: 20,
            },
            email: {
                bsonType: "string",
                description: "el campo 'email' es obligatorio y debe ser una cadena en formato de correo electrónico",
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            },
            password: {
                bsonType: "string",
                description: "el campo 'password' es obligatorio y debe ser una cadena con una longitud mínima de 8",
                minLength: 8,
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
        password: "password123",
        firstName: "Init",
        lastName: "User"
    };
    targetDb[collName].insertOne(_initDoc);
    targetDb[collName].deleteOne({ username: _initDoc.username });

    print('Schema de users aplicado correctamente.');
})();
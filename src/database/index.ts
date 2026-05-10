// src/database/index.ts
import mongoose from 'mongoose';

export async function conectarAoBancoDeDados() {
    // 1. Verifica se já existe uma conexão ativa (readyState 1 = conectado)
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    const uri = process.env.mongodbConnectionString;

    if (!uri) {
        throw new Error("mongodbConnectionString não encontrado no arquivo .env!");
    }

    try {
        // 2. Conecta usando o Mongoose
        await mongoose.connect(uri, {
            dbName: process.env.mongodbDatabaseName, // Seleciona o banco do .env
        });

        console.log("Conexão com MongoDB estabelecida com sucesso via Mongoose!");
        return mongoose.connection;
    } catch (error) {
        console.error("Erro ao conectar no banco de dados com Mongoose:", error);
        throw error;
    }
}

// src/database/index.ts
import { setServers } from 'node:dns';
import mongoose from 'mongoose';

function configurarServidoresDns() {
    const dnsServers = process.env.DNS_SERVERS
        ?.split(',')
        .map((server) => server.trim())
        .filter(Boolean);

    if (!dnsServers?.length) {
        return;
    }

    // Permite contornar resolvedores locais que recusam consultas SRV do MongoDB Atlas.
    setServers(dnsServers);
}

export async function conectarAoBancoDeDados() {
    // 1. Verifica se já existe uma conexão ativa (readyState 1 = conectado)
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    const uri = process.env.MONGO_DB_CONNECTION_STRING || process.env.MONGO_URL;
    const databaseName = process.env.MONGO_DB_DATABASE_NAME;

    if (!uri) {
        throw new Error("mongodbConnectionString não encontrado no arquivo .env!");
    }

    try {
        configurarServidoresDns();

        // 2. Conecta usando o Mongoose
        await mongoose.connect(uri, databaseName ? { dbName: databaseName } : undefined);

        console.log("Conexão com MongoDB estabelecida com sucesso via Mongoose!");
        return mongoose.connection;
    } catch (error) {
        console.error("Erro ao conectar no banco de dados com Mongoose:", error);
        throw error;
    }
}

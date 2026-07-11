// src/database/index.ts
import { setServers } from 'node:dns';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

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

        logger.info("database_connected", {
            provider: "mongodb",
            databaseConfigured: Boolean(databaseName),
        });
        return mongoose.connection;
    } catch (error) {
        logger.error("database_connection_failed", error, {
            provider: "mongodb",
        });
        throw error;
    }
}

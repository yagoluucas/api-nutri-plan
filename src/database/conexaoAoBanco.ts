// src/database/index.ts
import { setServers } from 'node:dns';
import mongoose from 'mongoose';
import { validarConfiguracaoBancoDeDados } from '../config/database.js';
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
    const { databaseName } = validarConfiguracaoBancoDeDados();

    // 1. Verifica se já existe uma conexão ativa (readyState 1 = conectado)
    if (mongoose.connection.readyState === 1) {
        if (mongoose.connection.name !== databaseName) {
            throw new Error(
                `Conexao MongoDB ativa no banco inesperado "${mongoose.connection.name}".`,
            );
        }

        return mongoose.connection;
    }

    const uri = process.env.MONGO_DB_CONNECTION_STRING || process.env.MONGO_URL;

    if (!uri) {
        throw new Error("mongodbConnectionString não encontrado no arquivo .env!");
    }

    try {
        configurarServidoresDns();

        // 2. Conecta usando o Mongoose
        await mongoose.connect(uri, { dbName: databaseName });

        logger.info("database_connected", {
            provider: "mongodb",
            databaseName,
        });
        return mongoose.connection;
    } catch (error) {
        logger.error("database_connection_failed", error, {
            provider: "mongodb",
        });
        throw error;
    }
}

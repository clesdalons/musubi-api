import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { TableClient } from "@azure/data-tables";

const getEnvVar = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`Environment variable ${name} is missing.`);
    return value;
};

const connectionString = getEnvVar("STORAGE_CONNECTION_STRING");

/**
 * Single Point of Truth for Azure Infrastructure
 */
export const azure = {
    // 1. Raw Settings
    storage: {
        connectionString,
        accountName: connectionString.match(/AccountName=([^;]+)/)?.[1] || "",
        accountKey: connectionString.match(/AccountKey=([^;]+)/)?.[1] || "",
        containerName: "saves",
        tableName: "savemetadata"
    },

    // 2. Pre-initialized Clients (Singletons)
    // We initialize them once here
    clients: {
        metadataTable: TableClient.fromConnectionString(connectionString, "savemetadata"),
        savesContainer: BlobServiceClient.fromConnectionString(connectionString).getContainerClient("saves")
    }
};
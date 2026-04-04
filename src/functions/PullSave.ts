import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from "@azure/storage-blob";
import { TableClient } from "@azure/data-tables";

export async function PullSave(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const campaignId = request.query.get('campaignId') || "musubi-main";
    const connectionString = process.env.STORAGE_CONNECTION_STRING;

    if (!connectionString) {
        return { status: 500, body: "Configuration Error" };
    }

    try {
        // 1. Récupérer les infos de la dernière save dans la Table
        const tableClient = TableClient.fromConnectionString(connectionString, "savemetadata");
        const metadata = await tableClient.getEntity(campaignId, "latest");

        // 2. Générer l'URL SAS pour le Blob
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerName = "saves";
        const blobName = `${campaignId}/latest.lsv`;
        
        // On extrait les infos de connexion pour la signature
        const parts = connectionString.split(';');
        const accountName = parts.find(p => p.startsWith('AccountName'))?.split('=')[1];
        const accountKey = parts.find(p => p.startsWith('AccountKey'))?.split('=')[1];

        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
        
        const sasToken = generateBlobSASQueryParameters({
            containerName,
            blobName,
            permissions: BlobSASPermissions.parse("r"), // "r" pour Read uniquement
            expiresOn: new Date(new Date().valueOf() + 15 * 60 * 1000), // Valable 15 minutes
        }, sharedKeyCredential).toString();

        const downloadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;

        return {
            status: 200,
            jsonBody: {
                campaignId: campaignId,
                lastUploader: metadata.lastUploader,
                timestamp: metadata.timestamp,
                fileSize: metadata.fileSize,
                downloadUrl: downloadUrl
            }
        };

    } catch (error) {
        context.error("Erreur PullSave:", error);
        return { status: 404, body: "Aucune sauvegarde trouvée pour cette campagne." };
    }
};

app.http('PullSave', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: PullSave
});
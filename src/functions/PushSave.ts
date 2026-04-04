import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { TableClient } from "@azure/data-tables";

export async function PushSave(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`PushSave: Début de la synchronisation...`);

    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const campaignId = request.query.get('campaignId') || "musubi-main";
    const uploader = request.query.get('uploader') || "Anonyme";

    if (!connectionString) {
        return { status: 500, body: "Erreur: STORAGE_CONNECTION_STRING non configurée." };
    }

    try {
        // 1. Récupération du binaire (.lsv)
        const blobData = await request.arrayBuffer();
        if (blobData.byteLength === 0) {
            return { status: 400, body: "Le fichier de sauvegarde est vide." };
        }

        // 2. Upload vers Blob Storage (On écrase 'latest.lsv')
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient("saves");
        const blockBlobClient = containerClient.getBlockBlobClient(`${campaignId}/latest.lsv`);

        context.log(`Upload du blob pour la campagne ${campaignId}...`);
        await blockBlobClient.uploadData(blobData);

        // 3. Mise à jour des métadonnées dans Table Storage
        const tableClient = TableClient.fromConnectionString(connectionString, "savemetadata");
        await tableClient.upsertEntity({
            partitionKey: campaignId,
            rowKey: "latest",
            lastUploader: uploader,
            timestamp: new Date().toISOString(),
            fileSize: blobData.byteLength
        });

        return { 
            status: 200, 
            body: `Sauvegarde de ${uploader} synchronisée avec succès (${blobData.byteLength} octets).` 
        };

    } catch (error) {
        context.error("Erreur lors du PushSave:", error);
        return { status: 500, body: "Erreur interne lors de la sauvegarde." };
    }
};

app.http('PushSave', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: PushSave
});
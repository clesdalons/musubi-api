import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from "@azure/storage-blob";
import { azure } from "../config/AzureConfig";
import { SaveMetadata } from "../models/SaveEntity";
import { PullSaveResponse } from "../models/PullSaveResponse";

/**
 * GET /PullSave
 * Fetches the most recent save metadata for a given campaign
 * and generates a temporary SAS URL for secure download.
 */
export async function PullSave(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {

    // Parse parameters with defaults
    const campaignId = request.query.get('campaignId') || "musubi-main";

    try {
        
        // 1. Fetch only the single most recent entity (Top 1)
        const entities = azure.clients.metadataTable.listEntities<SaveMetadata>({
            queryOptions: { 
                filter: `PartitionKey eq '${campaignId}'`,
                select: ["fileName", "uploader", "timestamp", "fileSize", "blobPath"]
            }
        });

        const latestSave = (await entities.next()).value;

        if (!latestSave) {
            context.warn(`No saves found for campaign: ${campaignId}`);
            return { status: 404, body: "No save found for this campaign." };
        }

        // 2. Generate SAS Token for secure, direct blob access
        const sharedKeyCredential = new StorageSharedKeyCredential(azure.storage.accountName, azure.storage.accountKey);
        
        const sasToken = generateBlobSASQueryParameters({
            containerName: azure.storage.containerName,
            blobName: latestSave.blobPath,
            permissions: BlobSASPermissions.parse("r"), // Read-only
            expiresOn: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes expiration
        }, sharedKeyCredential).toString();

        // 3. Building response
        const downloadUrl = `https://${azure.storage.accountName}.blob.core.windows.net/${azure.storage.containerName}/${latestSave.blobPath}?${sasToken}`;
        const responseBody : PullSaveResponse = {
            fileName: latestSave.fileName,
            uploader: latestSave.uploader,
            timestamp: latestSave.timestamp,
            fileSize: latestSave.fileSize,
            downloadUrl
        }; 

        return {
            status: 200,
            jsonBody: responseBody
        };

    } catch (error) {
        context.error("PullSave Error:", error);
        return { status: 500, body: "Internal server error while retrieving the save." };
    }
}

app.http('PullSave', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: PullSave
});
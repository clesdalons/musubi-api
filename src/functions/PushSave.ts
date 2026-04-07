import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { SaveMetadata } from "../models/SaveEntity";
import { azure } from "../config/AzureConfig";

/**
 * POST /PushSave
 * Receives a binary .lsv file, archives it with a unique name, 
 * and indexes metadata in Table Storage.
 */
export async function PushSave(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    
    context.log("PushSave: starting upload...");

    // Parse parameters with defaults
    const campaignId = request.query.get("campaignId") || "musubi-main";
    const uploader = request.query.get("uploader") || "Anonyme";
    const originalFileName = request.query.get("fileName") || "autosave.lsv";

    try {
        // 1. Retrieve uploaded save file
        const blobData = await request.arrayBuffer();
        if (blobData.byteLength === 0) {
            return { status: 400, body: "Empty file" };
        }

        const fileName = `save_${Date.now()}_${originalFileName}`;
        const uniqueBlobName = `${campaignId}/${fileName}`;

        // 2. Store file in Blob Storage
        context.log("Uploading save", { 
            campaignId, 
            uploader, 
            size: blobData.byteLength 
        });

        const blockBlobClient = azure.clients.savesContainer
            .getBlockBlobClient(uniqueBlobName);

        await blockBlobClient.uploadData(blobData);

        // 3. Register metadata in Table Storage
        const entityToInsert: SaveMetadata = {
            partitionKey: campaignId,
            rowKey: (Number.MAX_SAFE_INTEGER - Date.now()).toString(),
            campaignId,
            fileName: originalFileName,
            blobPath: uniqueBlobName,
            uploader,
            fileSize: blobData.byteLength,
            timestamp: new Date().toISOString()
        };

        await azure.clients.metadataTable.createEntity(entityToInsert);
      
        return { 
            status: 200, 
            body: `Save from ${uploader} uploaded successfully (${blobData.byteLength} bytes).` 
        };

    } catch (error) {
        context.error("An error occurred during PushSave:", error);
        return { status: 500, body: "Internal error during save." };
    }
}

app.http("PushSave", {
    methods: ["POST"],
    authLevel: "anonymous",
    handler: PushSave
});
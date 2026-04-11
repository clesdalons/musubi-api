import { InvocationContext } from "@azure/functions";
import { azure } from "../config/AzureConfig";
import { SaveMetadata } from "../models/SaveEntity";

/**
 * Common logic to fetch the latest save metadata from Azure Table Storage
 */
export async function FetchLatestSaveMetadata(campaignId: string, context: InvocationContext): Promise<SaveMetadata | null> {
    try {
        const entities = azure.clients.metadataTable.listEntities<SaveMetadata>({
            queryOptions: { 
                filter: `PartitionKey eq '${campaignId}'`,
                select: ["fileName", "uploader", "timestamp", "fileSize", "blobPath"]
            }
        });

        const result = await entities.next();
        return result.value || null;
    } catch (error) {
        context.error(`[Database Error] Failed to fetch metadata for ${campaignId}:`, error);
        throw error;
    }
}
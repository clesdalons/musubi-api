import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { FetchLatestSaveMetadata } from "../services/SaveService";
import { SaveInfoResponse } from "../models/JsonDTO";

/**
 * GET /GetLatestSaveInfo
 * * Purpose: Retrieves metadata for the most recent save without generating a download URL.
 * Usage: Ideal for client-side UI updates to check if a newer save exists in the cloud.
 */
export async function GetLatestSaveInfo(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    
    // Parse parameters with defaults
    const campaignId = request.query.get('campaignId') || "musubi-main";

    try {
        context.log(`[INFO] Fetching latest save metadata for campaign: ${campaignId}`);

        // 1. Fetch latest save metadata
        const latestSave = await FetchLatestSaveMetadata(campaignId, context);
        if (!latestSave) return { status: 404, body: "No save found." };

        // 2. Building response
        const response: SaveInfoResponse = {
            fileName: latestSave.fileName,
            uploader: latestSave.uploader,
            timestamp: latestSave.timestamp,
            fileSize: latestSave.fileSize,
            campaignId: latestSave.campaignId
        };
        return {
            status: 200,
            jsonBody: response
        };

    } catch (error) {
        context.error(`[ERROR] Failed to fetch info for campaign ${campaignId}:`, error);
        return { status: 500, body: "An unexpected error occurred while retrieving metadata." };
    }
}

// HTTP Function Registration
app.http('GetLatestSaveInfo', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: GetLatestSaveInfo
});
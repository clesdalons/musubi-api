import { TableEntity } from "@azure/data-tables";

/**
 * Represents a historical save entry in Azure Table Storage.
 * * Inheritance from TableEntity provides:
 * - partitionKey: Used as the Campaign ID.
 * - rowKey: Inverted timestamp (MAX_SAFE_INTEGER - Date.now()) for O(1) retrieval of the latest save.
 */
export interface SaveMetadata extends TableEntity {
    campaignId: string;   // Explicit campaign identifier
    fileName: string;     // Original file name (e.g., AutoSave_1.lsv)
    blobPath: string;     // Full path in blob storage (campaign/timestamp_name.lsv)
    uploader: string;     // Name/ID of the user who pushed the save
    fileSize: number;     // File size in bytes
    timestamp: string;    // ISO string for display purposes
}
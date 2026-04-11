
/**
 * Response object returned to the client when requesting the latest save.
 */
export interface SaveInfoResponse {
    fileName: string;
    uploader: string;
    timestamp: string;
    fileSize: number;
    campaignId: string;
}

// Adds the SAS URL
export interface PullSaveResponse extends SaveInfoResponse {
    downloadUrl: string;
}
/**
 * Response object returned to the client when requesting the latest save.
 */
export interface PullSaveResponse {
    fileName: string;
    uploader: string;
    timestamp: string;
    fileSize: number;
    downloadUrl: string;
}
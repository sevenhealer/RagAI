export interface IngestResponse {
    success: boolean;
    message: string;
    task_id?: string;
    indexed_chunk_ids?: string[];
}

export interface RetrievedChunk {
    id: string;
    text: string;
    distance: number;
    metadata: Record<string, any>; // Use a more specific type if metadata structure is known
}

export interface QueryResponse {
    answer: string;
    retrieved_context: RetrievedChunk[];
}

// Interface for API error responses (FastAPI often uses 'detail')
export interface ApiError {
    detail?: string;
    message?: string; // Include message as a fallback
}
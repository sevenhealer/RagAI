import { useState, ChangeEvent, FormEvent, useRef, JSX } from 'react';
import './App.css';
import { IngestResponse, QueryResponse, RetrievedChunk, ApiError } from './types';

// --- Configuration ---
// CHANGE THIS IF YOUR BACKEND IS RUNNING ON A DIFFERENT ADDRESS/PORT
const API_BASE_URL: string = 'http://localhost:8000';
// ---------------------


function App(): JSX.Element {
  // --- State Variables ---
  const [ingestUrl, setIngestUrl] = useState<string>('');
  const [ingestText, setIngestText] = useState<string>('');
  const [ingestSourceId, setIngestSourceId] = useState<string>('');
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestMetadata, setIngestMetadata] = useState<string>('{}'); // Store as JSON string for input field
  const [ingestStatus, setIngestStatus] = useState<string>('');

  const [query, setQuery] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [retrievedContext, setRetrievedContext] = useState<RetrievedChunk[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Ref for the file input to allow programmatic clearing
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Type Guards ---
  const isApiError = (error: any): error is ApiError => {
      return typeof error === 'object' && error !== null && (typeof error.detail === 'string' || typeof error.message === 'string');
  }

  // --- API Call Logic ---

  const handleIngest = async (endpoint: string, body: Record<string, any> | FormData, isFormData: boolean = false): Promise<void> => {
    setIsLoading(true);
    setError('');
    setIngestStatus('Ingesting...');

    let fetchBody: BodyInit | null = null;
    const headers: HeadersInit = {};

    try {
      if (isFormData) {
        fetchBody = body as FormData;
        // Let the browser set Content-Type for FormData
      } else {
        headers['Content-Type'] = 'application/json';
        fetchBody = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: headers,
        body: fetchBody,
      });

      let responseData: IngestResponse | ApiError | any;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        throw new Error(response.statusText || `HTTP error! status: ${response.status}`);
      }

      if (!response.ok) {
        const errorDetail = isApiError(responseData) ? (responseData.detail || responseData.message) : `HTTP error! status: ${response.status}`;
        throw new Error(errorDetail || `HTTP error! status: ${response.status}`);
      }

      const successData = responseData as IngestResponse;
      setIngestStatus(`Success: ${successData.message || 'Request accepted.'}`);

      // Clear form fields on success
      if (endpoint === '/ingest/url') setIngestUrl('');
      if (endpoint === '/ingest/text') { setIngestText(''); setIngestSourceId(''); }
      if (endpoint === '/ingest/file') {
        setIngestFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear the file input
        }
      }
       setIngestMetadata('{}'); // Clear metadata field for all ingest types

    } catch (err: unknown) {
      console.error("Ingestion error:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during ingestion.';
      setError(`Ingestion failed: ${errorMessage}`);
      setIngestStatus('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    setAnswer('');
    setRetrievedContext([]);
    setIngestStatus('');

    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query }),
      });

      let responseData: QueryResponse | ApiError | any;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        throw new Error(response.statusText || `HTTP error! status: ${response.status}`);
      }

      if (!response.ok) {
        const errorDetail = isApiError(responseData) ? (responseData.detail || responseData.message) : `HTTP error! status: ${response.status}`;
        throw new Error(errorDetail || `HTTP error! status: ${response.status}`);
      }

      const queryData = responseData as QueryResponse;
      setAnswer(queryData.answer);
      setRetrievedContext(queryData.retrieved_context || []);

    } catch (err: unknown) {
      console.error("Query error:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during query.';
      setError(`Query failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };


  // --- Event Handlers ---

  const handleUrlIngestSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    let parsedMeta = {};
    try { parsedMeta = JSON.parse(ingestMetadata || '{}'); } catch { /* ignore */ }
    handleIngest('/ingest/url', { url: ingestUrl, metadata: parsedMeta });
  };

  const handleTextIngestSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    let parsedMeta = {};
    try { parsedMeta = JSON.parse(ingestMetadata || '{}'); } catch { /* ignore */ }
    handleIngest('/ingest/text', { text: ingestText, source_id: ingestSourceId, metadata: parsedMeta });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      setIngestFile(e.target.files[0]);
    } else {
      setIngestFile(null);
    }
  };

  const handleFileIngestSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!ingestFile) {
      setError('Please select a file to ingest.');
      return;
    }
    const formData = new FormData();
    formData.append('file', ingestFile);
    let metaString = '{}';
    try {
        JSON.parse(ingestMetadata || '{}');
        metaString = ingestMetadata || '{}';
    } catch (parseError) {
        console.warn("Invalid metadata JSON provided, sending empty object string.");
        setError("Metadata must be a valid JSON string. Sending empty metadata.");
        // Decide if you want to proceed with empty metadata or stop
        // return; // Uncomment to stop if metadata is invalid
    }
    formData.append('metadata_json', metaString);
    handleIngest('/ingest/file', formData, true);
  };

  const handleQuerySubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    handleQuery();
  };

  // --- JSX Render ---
  return (
    <div className="App">
      <h1>RAG API Frontend (TypeScript)</h1>

      {/* --- Ingestion Section --- */}
      <section className="card">
        <h2>Ingest Data</h2>
        {ingestStatus && !isLoading && <p className="status-message">{ingestStatus}</p>}

        {/* Metadata Input (Common) */}
        <div className="metadata-input">
             <label htmlFor="ingestMetadata">
                 Common Metadata (JSON string):
            </label>
             <textarea
                id="ingestMetadata"
                value={ingestMetadata}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setIngestMetadata(e.target.value)}
                placeholder='{"key": "value", "optional_tags": ["alpha"]}'
                rows={3}
                disabled={isLoading}
            />
        </div>

        {/* URL Ingestion Form */}
        <form onSubmit={handleUrlIngestSubmit} className="ingest-form">
          <label htmlFor="ingestUrl">Ingest URL:</label>
          <input
            id="ingestUrl"
            type="url"
            value={ingestUrl}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setIngestUrl(e.target.value)}
            placeholder="https://example.com"
            required
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>Ingest URL</button>
        </form>

        {/* Text Ingestion Form */}
        <form onSubmit={handleTextIngestSubmit} className="ingest-form">
          <label htmlFor="ingestText">Ingest Text:</label>
          <textarea
            id="ingestText"
            value={ingestText}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setIngestText(e.target.value)}
            placeholder="Paste text here..."
            required
            rows={4}
            disabled={isLoading}
          />
          <label htmlFor="ingestSourceId">Source ID:</label>
          <input
            id="ingestSourceId"
            type="text"
            value={ingestSourceId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setIngestSourceId(e.target.value)}
            placeholder="Unique identifier (e.g., doc_1)"
            required
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>Ingest Text</button>
        </form>

        {/* File Ingestion Form */}
        <form onSubmit={handleFileIngestSubmit} className="ingest-form">
           <label htmlFor="fileInput">Ingest File (txt only for now):</label>
           <input
              id="fileInput"
              ref={fileInputRef} // Assign ref
              type="file"
              onChange={handleFileChange}
              accept=".txt"
              disabled={isLoading}
            />
          <button type="submit" disabled={isLoading || !ingestFile}>Ingest File</button>
        </form>
      </section>

      {/* --- Query Section --- */}
      <section className="card">
        <h2>Query</h2>
        <form onSubmit={handleQuerySubmit}>
          <label htmlFor="queryInput">Your Question:</label>
          <input
            id="queryInput"
            type="text"
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Ask something about the ingested content..."
            required
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !query}>Ask</button>
        </form>
      </section>

      {/* --- Results Section --- */}
      <section className="card results-section">
        <h2>Results</h2>
        {isLoading && <p className='loading-message'>Loading...</p>}
        {error && !isLoading && <p className="error-message">Error: {error}</p>}

        {answer && !isLoading && (
          <div className="answer">
            <h3>Answer:</h3>
            <p>{answer}</p>
          </div>
        )}

        {retrievedContext.length > 0 && !isLoading && (
          <div className="context">
            <h3>Retrieved Context Chunks ({retrievedContext.length}):</h3>
            {retrievedContext.map((chunk) => (
              <div key={chunk.id} className="context-chunk">
                <strong>ID:</strong> {chunk.id}<br />
                <strong>Distance:</strong> {chunk.distance?.toFixed(4)}<br />
                {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                   <>
                     <strong>Metadata:</strong>
                     <pre>{JSON.stringify(chunk.metadata, null, 2)}</pre>
                   </>
                )}
                <strong>Text:</strong>
                <p className="context-text">{chunk.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
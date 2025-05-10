"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Save, Play, FileText, Layers, Database, Brain } from "lucide-react"

export function ManualPipelineConfig() {
  const [activeTab, setActiveTab] = useState("ocr")

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Manual Processing Pipeline</CardTitle>
        <CardDescription>Configure each step of the document processing pipeline</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-6 mb-4">
            <TabsTrigger value="ocr" className="text-xs">
              OCR
            </TabsTrigger>
            <TabsTrigger value="parsing" className="text-xs">
              Parsing
            </TabsTrigger>
            <TabsTrigger value="chunking" className="text-xs">
              Chunking
            </TabsTrigger>
            <TabsTrigger value="embedding" className="text-xs">
              Embedding
            </TabsTrigger>
            <TabsTrigger value="vectordb" className="text-xs">
              Vector DB
            </TabsTrigger>
            <TabsTrigger value="llm" className="text-xs">
              LLM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ocr" className="space-y-4">
            <OcrConfig />
          </TabsContent>

          <TabsContent value="parsing" className="space-y-4">
            <ParsingConfig />
          </TabsContent>

          <TabsContent value="chunking" className="space-y-4">
            <ChunkingConfig />
          </TabsContent>

          <TabsContent value="embedding" className="space-y-4">
            <EmbeddingConfig />
          </TabsContent>

          <TabsContent value="vectordb" className="space-y-4">
            <VectorDbConfig />
          </TabsContent>

          <TabsContent value="llm" className="space-y-4">
            <LlmConfig />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-6">
          <Button variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            Save Pipeline
          </Button>
          <Button className="gap-2">
            <Play className="h-4 w-4" />
            Run Pipeline
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function OcrConfig() {
  const [ocrEngine, setOcrEngine] = useState("online")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">OCR Engine Selection</h3>
          <p className="text-sm text-muted-foreground">Extract text from images and documents</p>
        </div>
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ocr-engine">OCR Engine</Label>
        <Select value={ocrEngine} onValueChange={setOcrEngine}>
          <SelectTrigger id="ocr-engine">
            <SelectValue placeholder="Select OCR engine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="online">Online OCR Service</SelectItem>
            <SelectItem value="multimodal">Multimodal OCR</SelectItem>
            <SelectItem value="pytesseract">PyTesseract</SelectItem>
            <SelectItem value="easyocr">EasyOCR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ocr-language">Language</Label>
        <Select defaultValue="eng">
          <SelectTrigger id="ocr-language">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eng">English</SelectItem>
            <SelectItem value="multi">Multilingual</SelectItem>
            <SelectItem value="fra">French</SelectItem>
            <SelectItem value="deu">German</SelectItem>
            <SelectItem value="spa">Spanish</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="ocr-quality">Quality vs Speed</Label>
          <span className="text-xs text-muted-foreground">Balanced</span>
        </div>
        <Slider defaultValue={[50]} max={100} step={1} id="ocr-quality" />
      </div>
    </div>
  )
}

function ParsingConfig() {
  const [parsingEngine, setParsingEngine] = useState("pymupdf")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Document Parsing</h3>
          <p className="text-sm text-muted-foreground">Extract structured content from documents</p>
        </div>
        <Layers className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="parsing-engine">Parsing Engine</Label>
        <Select value={parsingEngine} onValueChange={setParsingEngine}>
          <SelectTrigger id="parsing-engine">
            <SelectValue placeholder="Select parsing engine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aws-textract">AWS Textract</SelectItem>
            <SelectItem value="pymupdf">PyMuPDF</SelectItem>
            <SelectItem value="unstructured">Unstructured.io</SelectItem>
            <SelectItem value="pymupdf-unstructured">PyMuPDF + Unstructured.io</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="extract-tables">Extract Tables</Label>
          <Switch id="extract-tables" defaultChecked />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="extract-images">Extract Images</Label>
          <Switch id="extract-images" defaultChecked />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="preserve-layout">Preserve Layout</Label>
          <Switch id="preserve-layout" defaultChecked />
        </div>
      </div>
    </div>
  )
}

function ChunkingConfig() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Text Chunking</h3>
          <p className="text-sm text-muted-foreground">Split text into manageable chunks</p>
        </div>
        <Layers className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="chunking-method">Chunking Method</Label>
        <Select defaultValue="recursive">
          <SelectTrigger id="chunking-method">
            <SelectValue placeholder="Select chunking method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recursive">Recursive Text Splitting</SelectItem>
            <SelectItem value="fixed">Fixed Size Chunks</SelectItem>
            <SelectItem value="semantic">Semantic Chunking</SelectItem>
            <SelectItem value="paragraph">Paragraph Splitting</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="chunk-size">Chunk Size (tokens)</Label>
          <span className="text-xs text-muted-foreground">1024</span>
        </div>
        <Slider defaultValue={[1024]} min={128} max={2048} step={128} id="chunk-size" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="chunk-overlap">Chunk Overlap</Label>
          <span className="text-xs text-muted-foreground">20%</span>
        </div>
        <Slider defaultValue={[20]} max={50} step={5} id="chunk-overlap" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="preserve-metadata">Preserve Metadata</Label>
          <Switch id="preserve-metadata" defaultChecked />
        </div>
      </div>
    </div>
  )
}

function EmbeddingConfig() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Embedding Model</h3>
          <p className="text-sm text-muted-foreground">Convert text to vector embeddings</p>
        </div>
        <Brain className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="embedding-model">Embedding Model</Label>
        <Select defaultValue="e5-small">
          <SelectTrigger id="embedding-model">
            <SelectValue placeholder="Select embedding model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="e5-small">E5-small (local)</SelectItem>
            <SelectItem value="e5-large">E5-large (local)</SelectItem>
            <SelectItem value="minilm">MiniLM (local)</SelectItem>
            <SelectItem value="openai">OpenAI Embeddings (online)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="embedding-dimensions">Embedding Dimensions</Label>
        <Select defaultValue="384">
          <SelectTrigger id="embedding-dimensions">
            <SelectValue placeholder="Select dimensions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="384">384 (balanced)</SelectItem>
            <SelectItem value="768">768 (high quality)</SelectItem>
            <SelectItem value="1536">1536 (highest quality)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="normalize-embeddings">Normalize Embeddings</Label>
          <Switch id="normalize-embeddings" defaultChecked />
        </div>
      </div>
    </div>
  )
}

function VectorDbConfig() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Vector Database</h3>
          <p className="text-sm text-muted-foreground">Store and retrieve vector embeddings</p>
        </div>
        <Database className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="vector-db">Vector Database</Label>
        <Select defaultValue="chroma">
          <SelectTrigger id="vector-db">
            <SelectValue placeholder="Select vector database" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chroma">ChromaDB (local)</SelectItem>
            <SelectItem value="faiss">FAISS (local)</SelectItem>
            <SelectItem value="qdrant">Qdrant (local)</SelectItem>
            <SelectItem value="pgvector">PostgreSQL + pgvector</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="storage-path">Storage Path</Label>
        <Input id="storage-path" defaultValue="./data/vectordb" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="similarity-metric">Similarity Metric</Label>
        <Select defaultValue="cosine">
          <SelectTrigger id="similarity-metric">
            <SelectValue placeholder="Select similarity metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cosine">Cosine Similarity</SelectItem>
            <SelectItem value="euclidean">Euclidean Distance</SelectItem>
            <SelectItem value="dot">Dot Product</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="top-k">Top K Results</Label>
          <span className="text-xs text-muted-foreground">5</span>
        </div>
        <Slider defaultValue={[5]} min={1} max={20} step={1} id="top-k" />
      </div>
    </div>
  )
}

function LlmConfig() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">LLM Configuration</h3>
          <p className="text-sm text-muted-foreground">Configure language model for responses</p>
        </div>
        <Brain className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="llm-model">LLM Model</Label>
        <Select defaultValue="llama3">
          <SelectTrigger id="llm-model">
            <SelectValue placeholder="Select LLM model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="llama3">Llama 3 (8B)</SelectItem>
            <SelectItem value="llama3-70b">Llama 3 (70B)</SelectItem>
            <SelectItem value="mistral">Mistral 7B</SelectItem>
            <SelectItem value="phi3">Phi-3 (mini)</SelectItem>
            <SelectItem value="gemma">Gemma 7B</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="temperature">Temperature</Label>
          <span className="text-xs text-muted-foreground">0.7</span>
        </div>
        <Slider defaultValue={[0.7]} min={0} max={2} step={0.1} id="temperature" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="max-tokens">Max Tokens</Label>
          <span className="text-xs text-muted-foreground">1024</span>
        </div>
        <Slider defaultValue={[1024]} min={256} max={4096} step={256} id="max-tokens" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="system-prompt">System Prompt</Label>
        <Input
          id="system-prompt"
          defaultValue="You are a helpful assistant that answers questions based on the provided document context."
        />
      </div>
    </div>
  )
}

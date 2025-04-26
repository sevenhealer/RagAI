"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Download, Save } from "lucide-react"

export function OfflineConfig() {
  const [ocrModel, setOcrModel] = useState("multimodal")
  const [llmModel, setLlmModel] = useState("llama3")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offline Mode Configuration</CardTitle>
        <CardDescription>Configure OCR and LLM models for offline processing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ocr-model">OCR Engine</Label>
          <Select value={ocrModel} onValueChange={setOcrModel}>
            <SelectTrigger id="ocr-model">
              <SelectValue placeholder="Select OCR model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multimodal">Multimodal OCR</SelectItem>
              <SelectItem value="pytesseract">PyTesseract</SelectItem>
              <SelectItem value="easyocr">EasyOCR</SelectItem>
              <SelectItem value="paddleocr">PaddleOCR</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {ocrModel === "multimodal" && "Uses AI vision models for OCR with high accuracy"}
            {ocrModel === "pytesseract" && "Open-source OCR engine with good general performance"}
            {ocrModel === "easyocr" && "Deep learning-based OCR with multilingual support"}
            {ocrModel === "paddleocr" && "High-performance OCR toolkit by Baidu"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-model">LLM Model</Label>
          <Select value={llmModel} onValueChange={setLlmModel}>
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
          <p className="text-xs text-muted-foreground mt-1">
            {llmModel === "llama3" && "Balanced performance and speed (4GB RAM)"}
            {llmModel === "llama3-70b" && "High performance, requires 32GB+ RAM"}
            {llmModel === "mistral" && "Efficient model with good performance (4GB RAM)"}
            {llmModel === "phi3" && "Lightweight model for lower-end hardware (2GB RAM)"}
            {llmModel === "gemma" && "Google's efficient model (4GB RAM)"}
          </p>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Models
          </Button>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

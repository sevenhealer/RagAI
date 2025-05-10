"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Save, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ApiConfigProps {
  onSave?: (config: ApiEndpoints) => void
}

export interface ApiEndpoints {
  baseUrl: string
  uploadEndpoint: string
  retrieveEndpoint: string
  queryEndpoint: string
}

export function ApiConfig({ onSave }: ApiConfigProps) {
  const { toast } = useToast()
  const [config, setConfig] = useState<ApiEndpoints>({
    baseUrl: "http://localhost:8000",
    uploadEndpoint: "/upload",
    retrieveEndpoint: "/retrieve",
    queryEndpoint: "/query",
  })

  const handleChange = (field: keyof ApiEndpoints, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    // Save to local storage
    localStorage.setItem("rag-api-config", JSON.stringify(config))

    if (onSave) {
      onSave(config)
    }

    toast({
      title: "API Configuration Saved",
      description: "Your API endpoints have been configured successfully.",
    })
  }

  // Update the testConnection function to handle CORS errors better
  const testConnection = async () => {
    try {
      toast({
        title: "Testing Connection",
        description: "Attempting to connect to the API...",
      })

      try {
        // Use a simple GET request instead of HEAD for better CORS compatibility
        const response = await fetch(`${config.baseUrl}/docs`, {
          method: "GET",
          headers: {
            Accept: "text/html",
          },
          // Only get headers, don't download the whole page
          mode: "cors",
          credentials: "include",
        })

        if (response.ok) {
          toast({
            title: "Connection Successful",
            description: "Successfully connected to the API server.",
            variant: "default",
          })
        } else {
          toast({
            title: "Connection Failed",
            description: `Server responded with status: ${response.status}`,
            variant: "destructive",
          })
        }
      } catch (error) {
        if (error instanceof Error && error.toString().includes("CORS")) {
          toast({
            title: "CORS Error",
            description: "Your API server needs CORS configuration. Please check the backend setup.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Connection Failed",
            description: "Could not connect to the API server. Please check the URL and try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to the API server. Please check the URL and try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Configuration</CardTitle>
        <CardDescription>Configure the endpoints for your RAG API</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="base-url">Base URL</Label>
          <Input
            id="base-url"
            value={config.baseUrl}
            onChange={(e) => handleChange("baseUrl", e.target.value)}
            placeholder="http://localhost:8000"
          />
          <p className="text-xs text-muted-foreground">The base URL of your FastAPI server</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="upload-endpoint">Upload Endpoint</Label>
          <Input
            id="upload-endpoint"
            value={config.uploadEndpoint}
            onChange={(e) => handleChange("uploadEndpoint", e.target.value)}
            placeholder="/upload"
          />
          <p className="text-xs text-muted-foreground">Endpoint for uploading files</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="retrieve-endpoint">Retrieve Endpoint</Label>
          <Input
            id="retrieve-endpoint"
            value={config.retrieveEndpoint}
            onChange={(e) => handleChange("retrieveEndpoint", e.target.value)}
            placeholder="/retrieve"
          />
          <p className="text-xs text-muted-foreground">Endpoint for retrieving context</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="query-endpoint">Query Endpoint</Label>
          <Input
            id="query-endpoint"
            value={config.queryEndpoint}
            onChange={(e) => handleChange("queryEndpoint", e.target.value)}
            placeholder="/query"
          />
          <p className="text-xs text-muted-foreground">Endpoint for querying with Gemini</p>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" className="gap-2" onClick={testConnection}>
            <RefreshCw className="h-4 w-4" />
            Test Connection
          </Button>
          <Button className="gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

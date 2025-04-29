"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

export interface ApiEndpoints {
  baseUrl: string
  uploadEndpoint: string
  deleteEndpoint: string
  documentsEndpoint: string
  queryEndpoint: string
}

const defaultConfig: ApiEndpoints = {
  baseUrl: "http://localhost:8000",
  uploadEndpoint: "/file/upload-file",
  deleteEndpoint: "/file/delete-file",
  documentsEndpoint: "/file/documents",
  queryEndpoint: "/rag/query",
}

export function useApiConfig() {
  const [apiConfig, setApiConfig] = useState<ApiEndpoints>(defaultConfig)
  const [isLoaded, setIsLoaded] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    // Load from localStorage on client side
    const savedConfig = localStorage.getItem("rag-api-config")
    if (savedConfig) {
      try {
        setApiConfig(JSON.parse(savedConfig))
      } catch (e) {
        console.error("Failed to parse saved API config", e)
      }
    }
    setIsLoaded(true)
  }, [])

  const updateApiConfig = (newConfig: ApiEndpoints) => {
    setApiConfig(newConfig)
    localStorage.setItem("rag-api-config", JSON.stringify(newConfig))
  }

  const getFullUrl = (endpoint: keyof Omit<ApiEndpoints, "baseUrl">) => {
    return `${apiConfig.baseUrl}${apiConfig[endpoint]}`
  }

  const getAuthHeaders = () => {
    if (!user) return {}
    return {
      Authorization: `Bearer ${user.token}`,
    }
  }

  return {
    apiConfig,
    updateApiConfig,
    isLoaded,
    getFullUrl,
    getAuthHeaders,
  }
}

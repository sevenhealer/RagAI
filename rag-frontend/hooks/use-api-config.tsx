"use client"

import { useState, useEffect } from "react"

export interface ApiEndpoints {
  baseUrl: string
  uploadEndpoint: string
  retrieveEndpoint: string
  queryEndpoint: string
}

const defaultConfig: ApiEndpoints = {
  baseUrl: "http://localhost:8000",
  uploadEndpoint: "/upload",
  retrieveEndpoint: "/retrieve",
  queryEndpoint: "/query",
}

export function useApiConfig() {
  const [apiConfig, setApiConfig] = useState<ApiEndpoints>(defaultConfig)
  const [isLoaded, setIsLoaded] = useState(false)

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

  return {
    apiConfig,
    updateApiConfig,
    isLoaded,
    getFullUrl,
  }
}

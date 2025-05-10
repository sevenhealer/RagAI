import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Check, AlertCircle, Loader2 } from "lucide-react"

interface PipelineStage {
  name: string
  status: "pending" | "processing" | "completed" | "error"
  icon: React.ReactNode
}

interface PipelineStatusProps {
  stages: PipelineStage[]
  currentStage: number
}

export function PipelineStatus({ stages, currentStage }: PipelineStatusProps) {
  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="space-y-4">
          <Progress value={(currentStage / (stages.length - 1)) * 100} className="h-2" />

          <div className="grid grid-cols-5 gap-2">
            {stages.map((stage, index) => (
              <div
                key={stage.name}
                className={`flex flex-col items-center p-2 rounded-md text-center ${
                  index === currentStage
                    ? "bg-primary/10 border border-primary/20"
                    : index < currentStage
                      ? "opacity-70"
                      : "opacity-50"
                }`}
              >
                <div className="mb-1">{stage.icon}</div>
                <p className="text-xs font-medium">{stage.name}</p>
                <div className="mt-1">
                  {stage.status === "pending" && (
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  )}
                  {stage.status === "processing" && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Processing
                    </Badge>
                  )}
                  {stage.status === "completed" && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                  {stage.status === "error" && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ArtworkGenerationProgressProps {
  total: number;
  completed: number;
  failed: number;
  isGenerating: boolean;
  onCancel?: () => void;
  errors?: string[];
}

export function ArtworkGenerationProgress({
  total,
  completed,
  failed,
  isGenerating,
  onCancel,
  errors = [],
}: ArtworkGenerationProgressProps) {
  const progress = Math.round(((completed + failed) / total) * 100);
  const remaining = total - completed - failed;
  const isComplete = completed + failed >= total;

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isGenerating && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {isComplete && !isGenerating && (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
          <h3 className="font-semibold">
            {isGenerating ? "Generating Artwork..." : "Generation Complete"}
          </h3>
        </div>
        <span className="text-2xl font-bold text-primary">{progress}%</span>
      </div>

      <Progress value={progress} className="h-3" />

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{total}</div>
          <div className="text-muted-foreground">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{completed}</div>
          <div className="text-muted-foreground">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{failed}</div>
          <div className="text-muted-foreground">Failed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{remaining}</div>
          <div className="text-muted-foreground">Remaining</div>
        </div>
      </div>

      {isGenerating && onCancel && (
        <Button variant="outline" onClick={onCancel} className="w-full">
          Cancel Generation
        </Button>
      )}

      {isComplete && (
        <Alert className={failed > 0 ? "border-orange-500" : "border-green-500"}>
          {failed > 0 ? (
            <XCircle className="h-4 w-4 text-orange-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertTitle>
            {failed > 0 ? "Generation Complete with Errors" : "All Artwork Generated Successfully!"}
          </AlertTitle>
          <AlertDescription>
            {failed > 0 ? (
              <>
                Generated {completed} artworks successfully. {failed} episodes failed.
                {errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">View Errors</summary>
                    <ul className="mt-2 space-y-1 text-xs">
                      {errors.slice(0, 10).map((error, i) => (
                        <li key={i} className="text-red-600">
                          {error}
                        </li>
                      ))}
                      {errors.length > 10 && (
                        <li className="text-muted-foreground">
                          ...and {errors.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  </details>
                )}
              </>
            ) : (
              `Successfully generated artwork for all ${completed} episodes!`
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}


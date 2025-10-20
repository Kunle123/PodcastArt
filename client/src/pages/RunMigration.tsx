import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";

export default function RunMigration() {
  const [results, setResults] = useState<string[]>([]);
  
  const migrateMutation = trpc.migrate.addTemplateFields.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
      toast.success("Migration completed successfully!");
    },
    onError: (error) => {
      toast.error(`Migration failed: ${error.message}`);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        <h1 className="text-3xl font-bold mb-4">🔧 Database Migration</h1>
        <p className="text-gray-600 mb-6">
          This will add the new template customization and bonus episode fields to your database:
        </p>
        
        <div className="mb-6 space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-2">📋 Template Fields:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li><code>borderRadius</code> - For rounded corners on episode numbers</li>
              <li><code>labelFormat</code> - For "Ep. 1" vs "Episode 1" vs "1"</li>
              <li><code>customPrefix</code> - For custom label prefix</li>
              <li><code>customSuffix</code> - For custom label suffix</li>
              <li><code>customPositionX</code> - For drag-and-drop custom X position (0-1)</li>
              <li><code>customPositionY</code> - For drag-and-drop custom Y position (0-1)</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm mb-2">⭐ Bonus Episode Fields:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li><code>episodes.isBonus</code> - Flag to mark episodes as bonus</li>
              <li><code>bonusNumberingMode</code> - How bonus episodes are numbered</li>
              <li><code>bonusLabel</code> - Custom label for bonus episodes</li>
              <li><code>bonusPrefix/Suffix</code> - Custom formatting for bonus labels</li>
            </ul>
          </div>
        </div>

        <Button
          onClick={() => migrateMutation.mutate()}
          disabled={migrateMutation.isPending}
          className="w-full mb-4"
          size="lg"
        >
          {migrateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Migration...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Run Migration
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="bg-gray-100 rounded p-4 mt-4">
            <h3 className="font-semibold mb-2">Migration Results:</h3>
            <div className="space-y-1 text-sm font-mono">
              {results.map((result, i) => (
                <div key={i}>{result}</div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-6">
          Note: You only need to run this once. After that, you can navigate back to the dashboard.
        </p>
      </Card>
    </div>
  );
}


import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RenumberEpisodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenumber: (mode: 'sequential' | 'custom', startNumber: number) => Promise<void>;
  episodeCount: number;
}

export function RenumberEpisodesDialog({ 
  open, 
  onOpenChange, 
  onRenumber, 
  episodeCount 
}: RenumberEpisodesDialogProps) {
  const [numberingMode, setNumberingMode] = useState<'sequential' | 'custom'>('sequential');
  const [customStartNumber, setCustomStartNumber] = useState('1');
  const [isRenumbering, setIsRenumbering] = useState(false);

  const handleRenumber = async () => {
    setIsRenumbering(true);
    try {
      const startNumber = numberingMode === 'custom' ? parseInt(customStartNumber) || 1 : 1;
      await onRenumber(numberingMode, startNumber);
      setNumberingMode('sequential');
      setCustomStartNumber('1');
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsRenumbering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Renumber Episodes</DialogTitle>
          <DialogDescription>
            Choose how to renumber your {episodeCount} episodes. This will overwrite existing episode numbers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-semibold mb-3 block">Numbering Method</Label>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <input
                  type="radio"
                  id="renumber-sequential"
                  name="renumbering"
                  checked={numberingMode === 'sequential'}
                  onChange={() => setNumberingMode('sequential')}
                  className="w-4 h-4 mt-0.5"
                  disabled={isRenumbering}
                />
                <div className="flex-1">
                  <Label htmlFor="renumber-sequential" className="text-sm font-normal cursor-pointer">
                    Sequential from 1
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Renumber all episodes as 1, 2, 3, 4... (newest first)
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Preview: 1, 2, 3, 4 ... {episodeCount}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="radio"
                  id="renumber-custom"
                  name="renumbering"
                  checked={numberingMode === 'custom'}
                  onChange={() => setNumberingMode('custom')}
                  className="w-4 h-4 mt-0.5"
                  disabled={isRenumbering}
                />
                <div className="flex-1">
                  <Label htmlFor="renumber-custom" className="text-sm font-normal cursor-pointer">
                    Start at custom number
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose a starting number and count up from there
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      value={customStartNumber}
                      onChange={(e) => setCustomStartNumber(e.target.value)}
                      disabled={isRenumbering || numberingMode !== 'custom'}
                      className="w-24 h-8"
                      min="1"
                      placeholder="1"
                    />
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      Preview: {customStartNumber}, {parseInt(customStartNumber) + 1}, {parseInt(customStartNumber) + 2} ... {parseInt(customStartNumber) + episodeCount - 1}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Warning:</strong> This will permanently replace all existing episode numbers. This action cannot be undone.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRenumbering}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenumber}
            disabled={isRenumbering}
          >
            {isRenumbering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Renumbering...
              </>
            ) : (
              "Renumber Episodes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


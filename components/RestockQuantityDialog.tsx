import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useUser } from '../contexts/UserContext'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { recordRestock } from '@/lib/api/transactions'
import { fetchItemSizes } from '@/lib/api/items'

// Define the structure of the item with sizes
interface ItemSize {
  size: string;
  quantity: number;
}

interface ItemWithSizes {
  id: string;
  name: string;
  productId: string;
  brand: string;
  sizes: ItemSize[];
  [key: string]: any; // Allow other properties
}

interface RestockQuantityDialogProps {
  item: any;
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  onSuccess?: () => void;
}

export default function RestockQuantityDialog({ 
  item, 
  showDialog, 
  setShowDialog, 
  onSuccess 
}: RestockQuantityDialogProps) {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [sizes, setSizes] = useState<any[]>([]);
  const [selectedSizeId, setSelectedSizeId] = useState("");

  // Fetch item sizes when item changes
  useEffect(() => {
    const fetchSizes = async () => {
      if (item && item.id) {
        try {
          const itemSizes = await fetchItemSizes(item.id);
          setSizes(itemSizes);
          if (itemSizes.length === 1) {
            setSelectedSizeId(itemSizes[0].id);
          }
        } catch (error) {
          console.error("Error fetching item sizes:", error);
          toast({
            title: "Error",
            description: "Failed to load item sizes.",
            variant: "destructive",
          });
        }
      }
    };
    
    if (showDialog) {
      fetchSizes();
    }
  }, [item, showDialog, toast]);

  const handleConfirmRestock = async () => {
    console.log('RestockQuantityDialog - handleConfirmRestock called');
    console.log('RestockQuantityDialog - item:', item);
    console.log('RestockQuantityDialog - selectedSizeId:', selectedSizeId);
    console.log('RestockQuantityDialog - quantity:', quantity);
    console.log('RestockQuantityDialog - currentUser:', currentUser);
    
    if (!currentUser) {
      console.log('RestockQuantityDialog - No current user found');
      toast({
        title: "Authentication Error",
        description: "You need to be logged in to perform this action. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }
    
    const qtyNum = Number.parseInt(quantity || '');
    if (!item || !selectedSizeId || Number.isNaN(qtyNum) || qtyNum <= 0) {
      console.log('RestockQuantityDialog - Validation failed');
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('RestockQuantityDialog - Starting restock process');
      setIsSubmitting(true);
      
      await recordRestock({
        itemId: item.id,
        itemSizeId: selectedSizeId,
        quantity: qtyNum,
        employeeId: currentUser.id,
        notes: notes
      });
      
      console.log('RestockQuantityDialog - Restock successful');
      toast({
        title: "Success",
        description: "Inventory restocked successfully.",
      });
      
      if (onSuccess) {
        console.log('RestockQuantityDialog - Calling onSuccess callback');
        onSuccess();
      }
      
      setShowDialog(false);
    } catch (error) {
      console.error("Error restocking inventory:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restock inventory. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCancel = () => {
    setShowDialog(false);
  };

  // If item is null, don't render the dialog content
  if (!item) return null;

  return (
    <Dialog open={showDialog} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lagerbestand auffüllen für {item.name}</DialogTitle>
        </DialogHeader>
        <div className="mx-auto w-full max-w-xl">
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="size">
              Größe
            </Label>
            <Select 
              value={selectedSizeId} 
              onValueChange={setSelectedSizeId}
            >
                <SelectTrigger className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none">
                <SelectValue placeholder="Größe auswählen" />
              </SelectTrigger>
              <SelectContent>
                {sizes.map((size) => (
                  <SelectItem key={size.id} value={size.id}>
                    {size.size} (Verfügbar: {size.available_quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">
              Menge
            </Label>
            <Input
              id="quantity"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
              value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
            />
          </div>
            <div className="space-y-2">
              <Label htmlFor="notes">
              Notizen
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: Zusätzliche Informationen"
                className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
            />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
          <Button 
            onClick={() => {
              console.log('RestockQuantityDialog - Confirm button clicked');
              handleConfirmRestock();
            }} 
            disabled={(() => {
              const q = Number.parseInt(quantity || '');
              return isSubmitting || Number.isNaN(q) || q <= 0 || !selectedSizeId;
            })()}
          >
            {isSubmitting ? 'Wird gespeichert...' : 'Bestätigen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


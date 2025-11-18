import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { recordReturn } from '@/lib/api/transactions';
import { fetchItemSizes, ItemSize } from '@/lib/api/items';
import { getPromoterInventory } from '@/lib/api/promoters'; // Import function to fetch inventory
import { useUser } from '../contexts/UserContext';
import PromoterSelector from './PromoterSelector';
import { supabase } from '@/lib/supabase';
import ReturnWarningDialog from './ReturnWarningDialog';
import { Loader2 } from 'lucide-react'; // Import Loader
import { Promoter } from '@/lib/api/promoters'; // Ensure Promoter type is imported

// Define PromoterItem type (adjust based on actual structure if different)
interface PromoterItem {
  id: string;
  item_id: string;
  item_size_id: string; // Assuming size ID is stored
  promoterId: string;
  size: string; // Assuming size string is stored
  productId: string; // Assuming product ID is stored
  // Add other relevant fields from promoterItems
}

interface ReturnDialogProps {
  item: any; // Consider using a more specific type if available
  setReturningItem: (item: any) => void;
  onSuccess?: () => void;
  // Remove promoterItems prop
}

export default function ReturnDialog({
  item,
  setReturningItem,
  onSuccess,
  // Removed promoterItems prop
}: ReturnDialogProps) {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState<string>('');
  const [promoterId, setPromoterId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [sizes, setSizes] = useState<ItemSize[]>([]); // Use ItemSize type
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingInventory, setIsCheckingInventory] = useState(false); // Loading state for check
  const [notes, setNotes] = useState("");
  const [showReturnWarning, setShowReturnWarning] = useState(false); // State for warning dialog

  // Debug: Log component mount and props
  useEffect(() => {
    console.log('ReturnDialog mounted with item:', item);
  }, [item]);

  // Fetch item sizes
  useEffect(() => {
    const fetchSizes = async () => {
      if (item && item.id) {
        try {
          console.log('Fetching sizes for item:', item.id);
          const itemSizes = await fetchItemSizes(item.id);
          console.log('Fetched sizes:', itemSizes);
          setSizes(itemSizes);
          if (itemSizes.length === 1) {
            setSizeId(itemSizes[0].id);
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
    
    fetchSizes();
  }, [item, toast]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('ReturnDialog state:', { 
      promoterId, 
      sizeId, 
      quantity, 
      isSubmitting 
    });
  }, [promoterId, sizeId, quantity, isSubmitting]);

  // Renamed handler to handlePromoterChange
  const handlePromoterChange = (promoter: Promoter | null) => {
    const id = promoter?.id || "";
    console.log('ReturnDialog - Promoter changed to:', id, promoter);
    setPromoterId(id);
  };

  // Function to perform the actual return logic
  const performReturn = async () => {
    const qtyNum = Number.parseInt(quantity || '');
    // Add check for currentUser before proceeding
    if (!currentUser?.id) {
        toast({
            title: "Error",
            description: "Benutzerinformation nicht gefunden. Bitte erneut anmelden.",
            variant: "destructive",
        });
        setIsSubmitting(false); // Ensure submitting state is reset
        return;
    }
    
    try {
      setIsSubmitting(true);
      
      console.log('ReturnDialog - Before API call:', {
        itemId: item.id,
        itemSizeId: sizeId,
        quantity: qtyNum,
        promoterId: promoterId
      });
      
      // Get current quantities directly from the database for comparison
      const { data: beforeData } = await supabase
        .from('item_sizes')
        .select('available_quantity, in_circulation')
        .eq('id', sizeId)
        .single();
        
      console.log('ReturnDialog - DB quantities before transaction:', {
        available: beforeData?.available_quantity,
        inCirculation: beforeData?.in_circulation
      });
      
      await recordReturn({
        itemId: item.id,
        itemSizeId: sizeId,
        quantity: qtyNum,
        promoterId: promoterId,
        employeeId: currentUser.id,
        notes: notes
      });
      
      console.log('ReturnDialog - After API call');
      
      // Get updated quantities directly from the database
      const { data: afterData } = await supabase
        .from('item_sizes')
        .select('available_quantity, in_circulation')
        .eq('id', sizeId)
        .single();
        
      console.log('ReturnDialog - DB quantities after transaction:', {
        available: afterData?.available_quantity,
        inCirculation: afterData?.in_circulation
      });
      
      toast({
        title: "Success",
        description: "Item returned successfully.",
      });
      
      if (onSuccess) {
        console.log('ReturnDialog - Calling onSuccess callback');
        onSuccess();
      }
      
      setReturningItem(null); // Close the main dialog
    } catch (error) {
      console.error("Error returning item:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to return item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial confirmation handler - performs check first
  const handleConfirmReturn = async () => {
    const qtyNum = Number.parseInt(quantity || '');
    // Add check for currentUser before proceeding
    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "No employee selected. Please select an employee first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!item || !sizeId || !promoterId || Number.isNaN(qtyNum) || qtyNum <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingInventory(true); // Start loading for check
    let promoterInventory = [];
    try {
        // Fetch the specific promoter's inventory
        promoterInventory = await getPromoterInventory(promoterId);
        console.log("Fetched promoter inventory for check:", promoterInventory);

        const selectedSizeObj = sizes.find(s => s.id === sizeId);
        if (!selectedSizeObj) {
            toast({ title: "Error", description: "Selected size not found.", variant: "destructive" });
            setIsCheckingInventory(false);
            return; 
        }

        // Check if the fetched inventory contains the item/size
        const hasItem = promoterInventory.some(
          (pInvItem: any) => 
            pInvItem.item?.product_id === item.product_id && // Use item.product_id
            pInvItem.size?.size === selectedSizeObj.size // Use size.size
        );

        if (!hasItem) {
            console.log("Promoter doesn't have the item/size. Showing warning.");
            setShowReturnWarning(true);
        } else {
            console.log("Promoter has the item/size. Proceeding with return.");
            await performReturn();
        }

    } catch (error) {
        console.error("Error checking promoter inventory:", error);
        toast({ title: "Error", description: "Could not verify promoter inventory.", variant: "destructive" });
    } finally {
        setIsCheckingInventory(false); // Stop loading for check
    }
  };

  // Handler for the warning dialog's confirm button
  const handleConfirmAnyways = async () => {
    console.log("User confirmed return despite warning.");
    setShowReturnWarning(false); // Close warning dialog
    await performReturn(); // Proceed with the return logic
  };

  if (!item) return null;

  // Find the selected size to display in circulation quantity
  const selectedSize = sizes.find(size => size.id === sizeId);
  const inCirculationQuantity = selectedSize ? selectedSize.in_circulation : 0;

  return (
    <>
      <Dialog open={!!item} onOpenChange={(open) => !open && !showReturnWarning && setReturningItem(null)}> 
        {/* Main Return Dialog Content */}
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Artikel zurückgeben</DialogTitle>
          </DialogHeader>
          {isCheckingInventory ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="mx-auto w-full">
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="returnItem">Artikel</Label>
                  <Input
                    id="returnItem"
                    value={item.name || item.product_id}
                    readOnly
                    className="w-full h-8 text-sm focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                  />
              </div>
              
                <div className="space-y-2">
                  <Label htmlFor="returnSize">Größe</Label>
                <Select value={sizeId} onValueChange={setSizeId}>
                    <SelectTrigger className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none">
                    <SelectValue placeholder="Größe auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes.map((size) => (
                      <SelectItem key={size.id} value={size.id}>
                        {size.size} (Im Umlauf: {size.in_circulation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
                <div className="space-y-2">
                  <Label htmlFor="returnQuantity">Menge</Label>
                <Input
                  id="returnQuantity"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                />
                {selectedSize && (
                    <div className="text-right text-sm text-muted-foreground">
                    Im Umlauf: {inCirculationQuantity}
                  </div>
                )}
              </div>
              
                <div className="space-y-2">
                  <Label htmlFor="returnPromoter">Promoter</Label>
                  <PromoterSelector 
                    value={promoterId} 
                    onChange={handlePromoterChange} 
                    placeholder="Promoter auswählen"
                    includeInactive={true}
                  />
              </div>
              
                <div className="space-y-2">
                  <Label htmlFor="returnNotes">Notizen</Label>
                <Input
                  id="returnNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional: Zusätzliche Informationen"
                    className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="h-9" onClick={() => setReturningItem(null)} disabled={isSubmitting || isCheckingInventory}>Abbrechen</Button>
            <Button 
              onClick={handleConfirmReturn}
              disabled={(() => {
                const q = Number.parseInt(quantity || '');
                return isSubmitting || isCheckingInventory || !sizeId || !promoterId || Number.isNaN(q) || q <= 0 || (selectedSize ? q > inCirculationQuantity : false);
              })()}
              className="h-9 rounded-md border text-green-600 bg-green-500/10 hover:bg-green-500/15 border-green-500 shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
            >
              {(isSubmitting || isCheckingInventory) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Wird gespeichert...' : isCheckingInventory ? 'Prüfe Inventar...' : 'Bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render the Warning Dialog Conditionally */}
      <ReturnWarningDialog
        open={showReturnWarning}
        onClose={() => setShowReturnWarning(false)}
        onConfirm={handleConfirmAnyways}
      />
    </>
  );
} 
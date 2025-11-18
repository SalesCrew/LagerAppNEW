"use client";

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Upload, Search, Loader2 } from 'lucide-react'
import Image from "next/image"
import ConfirmSharedItemDialog from './ConfirmSharedItemDialog'
import { useItems } from '@/hooks/useItems'
import { useToast } from '@/hooks/use-toast'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import { Item } from '@/lib/api/items'

type SizeInput = { size: string; quantity: number | "" }
type NewItemState = {
  name: string
  productId: string
  sizes: SizeInput[]
  image: string
}
type ItemWithSizes = Item & { sizes?: Array<{ size: string; quantity: number }> }

interface AddItemDialogProps {
  showDialog: boolean
  setShowDialog: (show: boolean) => void
  brandId: string
}

export default function AddItemDialog({ showDialog, setShowDialog, brandId }: AddItemDialogProps) {
  const { addItem, items, refreshItems } = useItems(brandId);
  const { toast } = useToast();
  
  const [newItem, setNewItem] = useState<NewItemState>({ 
    name: "", 
    productId: "", 
    sizes: [{ size: "Einheitsgröße", quantity: "" }], 
    image: "/placeholder.svg" 
  })
  const [multipleSizes, setMultipleSizes] = useState(false)
  const [sharedItemInput, setSharedItemInput] = useState("")
  const [sharedItemResults, setSharedItemResults] = useState<ItemWithSizes[]>([])
  const [selectedSharedItem, setSelectedSharedItem] = useState<ItemWithSizes | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (showDialog) {
      setNewItem({ 
        name: "", 
        productId: "", 
        sizes: [{ size: "Einheitsgröße", quantity: "" }], 
        image: "/placeholder.svg" 
      })
      setMultipleSizes(false)
      setSharedItemInput("")
      setSharedItemResults([])
      setSelectedSharedItem(null)
      setImageFile(null)
    }
  }, [showDialog])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      // Create a preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setNewItem({ ...newItem, image: e.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  // Search for shared items
  const searchSharedItems = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSharedItemResults([]);
      return;
    }

    try {
      setIsSearching(true);
      
      // Search by name or product_id
      const { data, error } = await supabase
        .from('items')
        .select('id, name, product_id, image_url, original_quantity, is_shared')
        .or(`name.ilike.%${searchTerm}%,product_id.ilike.%${searchTerm}%`)
        .limit(10);
        
      if (error) {
        console.error('Error searching items:', error);
        throw error;
      }
      
      // For each item, fetch its sizes
      const itemsWithSizes: ItemWithSizes[] = await Promise.all(data.map(async (item: Item) => {
        const { data: sizesData, error: sizesError } = await supabase
          .from('item_sizes')
          .select('size, original_quantity')
          .eq('item_id', item.id);
          
        if (sizesError) {
          console.error('Error fetching item sizes:', sizesError);
          return {
            ...item,
            sizes: [{ size: 'Einheitsgröße', quantity: item.original_quantity }]
          };
        }
        
        return {
          ...item,
          sizes: sizesData.map((s: { size: string; original_quantity: number }) => ({ 
            size: s.size, 
            quantity: s.original_quantity 
          }))
        };
      }));
      
      setSharedItemResults(itemsWithSizes);
    } catch (error) {
      console.error('Error searching items:', error);
      toast({
        title: 'Error',
        description: 'Failed to search for items. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSharedItems(sharedItemInput);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [sharedItemInput]);

  const handleAdd = async () => {
    try {
      console.log('AddItemDialog - handleAdd started');
      setIsSubmitting(true)
      
      // Validate input
      if (!newItem.name.trim()) {
        toast({
          title: "Error",
          description: "Bitte geben Sie einen Namen für den Artikel ein.",
          variant: "destructive",
        })
        return
      }
      
      // Generate a random product ID if not provided
      let productIdToUse = newItem.productId.trim();
      if (!productIdToUse) {
        productIdToUse = uuidv4();
      }

      // Validate quantity
      const totalQuantity = newItem.sizes.reduce((sum, size) => {
        const q = typeof size.quantity === 'number' ? size.quantity : (parseInt(size.quantity as any) || 0);
        return sum + q;
      }, 0)
      if (totalQuantity <= 0) {
        toast({
          title: "Error",
          description: "Die Menge muss größer als 0 sein.",
          variant: "destructive",
        })
        return
      }
      
      // Validate that all sizes have names when using multiple sizes
      if (multipleSizes) {
        // Check for empty size names
        for (const size of newItem.sizes) {
          if (!size.size.trim()) {
            toast({
              title: "Error",
              description: "Alle Größen müssen einen Namen haben.",
              variant: "destructive",
            })
            return
          }
        }
        
        // Check for duplicate size names
        const sizeNames = newItem.sizes.map(size => size.size.trim())
        const uniqueSizeNames = new Set(sizeNames)
        if (sizeNames.length !== uniqueSizeNames.size) {
          toast({
            title: "Error",
            description: "Jede Größe muss einen eindeutigen Namen haben.",
            variant: "destructive",
          })
          return
        }
      }
      
      console.log('AddItemDialog - Calling addItem with name:', newItem.name);
      // Create the item
      const newItemResult = await addItem(
        newItem.name,
        productIdToUse,
        totalQuantity,
        imageFile,
        false, // not shared
        multipleSizes 
          ? newItem.sizes.map(s => ({
              size: s.size,
              quantity: typeof s.quantity === 'number' ? s.quantity : (parseInt(s.quantity as any) || 0)
            }))
          : undefined // Pass sizes array if multiple sizes are enabled
      )
      console.log('AddItemDialog - addItem completed successfully');
      
      // Reset form and close dialog
      setNewItem({ 
        name: "", 
        productId: "", 
        sizes: [{ size: "Einheitsgröße", quantity: "" }], 
        image: "/placeholder.svg" 
      })
      setImageFile(null)
      setShowDialog(false)
      
      toast({
        title: "Erfolg",
        description: "Artikel wurde erfolgreich hinzugefügt.",
      })

      console.log('AddItemDialog - Calling refreshItems with brandId:', newItemResult.brand_id);
      // Refresh items immediately with the brandId from the new item
      await refreshItems(newItemResult.brand_id)
      console.log('AddItemDialog - refreshItems completed');
      
    } catch (error) {
      console.error("Error adding item:", error)
      toast({
        title: "Error",
        description: "Fehler beim Hinzufügen des Artikels. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSharedItemSelect = (item: ItemWithSizes) => {
    setSelectedSharedItem(item);
    setSharedItemInput(item.name);
    setSharedItemResults([]);
    
    // Set the newItem values based on the selected shared item
    setNewItem({
      name: item.name,
      productId: item.product_id,
      sizes: item.sizes || [{ size: "Einheitsgröße", quantity: item.original_quantity }],
      image: item.image_url || "/placeholder.svg"
    });
    
    // Show the confirm dialog
    setShowConfirmDialog(true);
  };

  return (
    <>
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuen Artikel hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sharedItem">Shared Item</Label>
            <div className="relative">
              <div className="relative flex-grow">
                <Input
                  id="sharedItem"
                  value={sharedItemInput}
                  onChange={(e) => {
                    setSharedItemInput(e.target.value);
                    setSelectedSharedItem(null);
                  }}
                  placeholder="Nach Artikel suchen (Name oder Produkt-ID)"
                  className="pr-8 w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                />
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                ) : (
                  <Search className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                )}
              </div>
              {sharedItemResults.length > 0 && !selectedSharedItem && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {sharedItemResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => handleSharedItemSelect(item)}
                    >
                      <div className="w-8 h-8 mr-2 flex-shrink-0">
                        <Image
                          src={item.image_url || "/placeholder.svg"}
                          alt=""
                          width={32}
                          height={32}
                          className="object-contain w-full h-full"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">ID: {item.product_id}</div>
                      </div>
                      {item.is_shared && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Shared
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {selectedSharedItem ? (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Name</Label>
                <div className="col-span-3">{newItem.name}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Produkt-ID</Label>
                <div className="col-span-3">{newItem.productId}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Größen und Mengen</Label>
                <div className="col-span-3">
                  {newItem.sizes.map((size, index) => (
                    <div key={index} className="mb-2">
                      {size.size}: {size.quantity}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Bild</Label>
                <div className="col-span-3">
                  <Image
                    src={newItem.image}
                    alt="Artikelbild"
                    width={100}
                    height={100}
                    className="object-contain"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <Switch
                  id="size-mode"
                  checked={multipleSizes}
                  onCheckedChange={(checked) => {
                    setMultipleSizes(checked)
                    if (checked) {
                      setNewItem({...newItem, sizes: [{ size: '', quantity: '' }]})
                    } else {
                      setNewItem({...newItem, sizes: [{ size: 'Einheitsgröße', quantity: '' }]})
                    }
                  }}
                />
                <Label htmlFor="size-mode">Mehrere Größen</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productId">Produkt-ID</Label>
                <Input
                  id="productId"
                  value={newItem.productId}
                  onChange={(e) => setNewItem({...newItem, productId: e.target.value})}
                  className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">{multipleSizes ? 'Größen und Mengen' : 'Menge'}</Label>
                <div>
                  {multipleSizes ? (
                    <div className="max-h-[200px] overflow-y-auto px-1 py-1 rounded-md">
                      {newItem.sizes.map((size, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                          <Input
                            placeholder="Größe"
                            value={size.size}
                            onChange={(e) => {
                              const newSizes = [...newItem.sizes];
                              newSizes[index].size = e.target.value;
                              setNewItem({...newItem, sizes: newSizes});
                            }}
                            className="w-1/2 h-8 text-sm focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                          />
                          <Input
                            type="number"
                            placeholder="Menge"
                            value={size.quantity === 0 ? "" : (size.quantity as any)}
                            onChange={(e) => {
                              const newSizes = [...newItem.sizes];
                              const value = e.target.value;
                              newSizes[index].quantity = value === "" ? "" : (parseInt(value) || 0);
                              setNewItem({...newItem, sizes: newSizes});
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-1/2 h-8 text-sm focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Input
                      id="quantity"
                      type="number"
                      value={
                        typeof newItem.sizes[0].quantity === 'number'
                          ? (newItem.sizes[0].quantity === 0 ? "" : newItem.sizes[0].quantity)
                          : (newItem.sizes[0].quantity as any)
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewItem({
                          ...newItem,
                          sizes: [{
                            size: 'Einheitsgröße',
                            quantity: value === "" ? "" : (parseInt(value) || 0)
                          }]
                        })
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  )}
                  
                  {multipleSizes && (
                    <Button
                      onClick={() => setNewItem({...newItem, sizes: [...newItem.sizes, { size: '', quantity: '' }]})}
                      variant="outline"
                      className="mt-2"
                      size="sm"
                    >
                      Größe hinzufügen
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <Input
                    id="itemImage"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-9 rounded-md border text-black bg-black/10 hover:bg-black/15 border-black focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                    type="button"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Bild hochladen
                  </Button>
                </div>
              </div>
              {newItem.image && newItem.image !== "/placeholder.svg" && (
                <div className="mt-2">
                  <Image
                    src={newItem.image}
                    alt="Vorschau"
                    width={100}
                    height={100}
                    className="object-contain"
                  />
                </div>
              )}
            </>
          )}
        </div>
        <Button 
          onClick={handleAdd} 
          disabled={selectedSharedItem !== null || isSubmitting}
          className="w-full h-9 rounded-md border text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-700 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird hinzugefügt...
            </>
          ) : (
            "Hinzufügen"
          )}
        </Button>
      </DialogContent>
    </Dialog>
    {showConfirmDialog && selectedSharedItem && (
      <ConfirmSharedItemDialog
        item={selectedSharedItem}
        brandId={brandId}
        onConfirm={(item) => {
          setShowConfirmDialog(false);
          setSelectedSharedItem(null);
          setSharedItemInput("");
          refreshItems();
          setShowDialog(false);
        }}
        onCancel={() => {
          setShowConfirmDialog(false);
          setSelectedSharedItem(null);
          setSharedItemInput("");
        }}
      />
    )}
    </>
  )
}

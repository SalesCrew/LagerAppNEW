"use client";

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Upload, Loader2, X } from 'lucide-react'
import Image from "next/image"
import { useItems } from '@/hooks/useItems'
import { useToast } from '@/hooks/use-toast'
import { fetchItemSizes, addItemSize, updateItemSize, deleteItemSize, ItemSize } from '@/lib/api/items'
import { updateItemImage } from '@/lib/api/storage'
import { supabase } from '@/lib/supabase'

type SizeInput = {
  id?: string
  size: string
  quantity: number | ""
  originalDbQuantity?: number
  availableQuantity?: number
  inCirculation?: number
}

interface EditItemDialogProps {
  item: any
  setEditingItem: (item: any) => void
  brandId: string
}

export default function EditItemDialog({ item, setEditingItem, brandId }: EditItemDialogProps) {
  const { updateItemDetails, refreshItems } = useItems(brandId);
  const { toast } = useToast();

  const [name, setName] = useState('')
  const [productId, setProductId] = useState('')
  const [sizes, setSizes] = useState<SizeInput[]>([])
  const [originalSizeIds, setOriginalSizeIds] = useState<string[]>([])
  const [multipleSizes, setMultipleSizes] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('/placeholder.svg')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSizes, setIsLoadingSizes] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!item) return

    setName(item.name || '')
    setProductId(item.product_id || '')
    setImagePreview(item.image_url || '/placeholder.svg')
    setImageFile(null)
    setIsLoadingSizes(true)

    fetchItemSizes(item.id).then((dbSizes: ItemSize[]) => {
      const hasMultiple = dbSizes.length > 1 || (dbSizes.length === 1 && dbSizes[0].size !== 'Einheitsgröße')
      setMultipleSizes(hasMultiple)

      const mappedSizes: SizeInput[] = dbSizes.map(s => ({
        id: s.id,
        size: s.size,
        quantity: s.original_quantity,
        originalDbQuantity: s.original_quantity,
        availableQuantity: s.available_quantity,
        inCirculation: s.in_circulation,
      }))

      if (mappedSizes.length === 0) {
        mappedSizes.push({ size: 'Einheitsgröße', quantity: '' })
      }

      setSizes(mappedSizes)
      setOriginalSizeIds(dbSizes.map(s => s.id))
      setIsLoadingSizes(false)
    }).catch(() => {
      setSizes([{ size: 'Einheitsgröße', quantity: '' }])
      setOriginalSizeIds([])
      setIsLoadingSizes(false)
    })
  }, [item])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleUpdate = async () => {
    try {
      setIsSubmitting(true)

      if (!name.trim()) {
        toast({ title: "Error", description: "Bitte geben Sie einen Namen ein.", variant: "destructive" })
        return
      }
      if (!productId.trim()) {
        toast({ title: "Error", description: "Bitte geben Sie eine Produkt-ID ein.", variant: "destructive" })
        return
      }

      const totalQuantity = sizes.reduce((sum, s) => {
        const q = typeof s.quantity === 'number' ? s.quantity : (parseInt(s.quantity as any) || 0)
        return sum + q
      }, 0)
      if (totalQuantity <= 0) {
        toast({ title: "Error", description: "Die Menge muss größer als 0 sein.", variant: "destructive" })
        return
      }

      if (multipleSizes) {
        for (const s of sizes) {
          if (!s.size.trim()) {
            toast({ title: "Error", description: "Alle Größen müssen einen Namen haben.", variant: "destructive" })
            return
          }
        }
        const sizeNames = sizes.map(s => s.size.trim())
        if (new Set(sizeNames).size !== sizeNames.length) {
          toast({ title: "Error", description: "Jede Größe muss einen eindeutigen Namen haben.", variant: "destructive" })
          return
        }
      }

      // Update item details (name, product_id, image)
      await updateItemDetails(item.id, name, productId, imageFile || undefined)

      // Handle sizes: determine added, updated, removed
      const currentSizeIds = sizes.filter(s => s.id).map(s => s.id!)
      const removedIds = originalSizeIds.filter(id => !currentSizeIds.includes(id))

      for (const id of removedIds) {
        await deleteItemSize(id)
      }

      for (const s of sizes) {
        const qty = typeof s.quantity === 'number' ? s.quantity : (parseInt(s.quantity as any) || 0)

        if (s.id) {
          const diff = qty - (s.originalDbQuantity || 0)
          const newAvailable = Math.max(0, (s.availableQuantity || 0) + diff)
          await updateItemSize(s.id, {
            size: s.size,
            original_quantity: qty,
            available_quantity: newAvailable,
            in_circulation: s.inCirculation || 0,
          })
        } else {
          await addItemSize({
            item_id: item.id,
            size: multipleSizes ? s.size : 'Einheitsgröße',
            original_quantity: qty,
            available_quantity: qty,
            in_circulation: 0,
          })
        }
      }

      // Update the item's total original_quantity
      const { error: updateError } = await supabase
        .from('items')
        .update({ original_quantity: totalQuantity })
        .eq('id', item.id)

      await refreshItems()
      setEditingItem(null)

      toast({ title: "Erfolg", description: "Artikel wurde erfolgreich aktualisiert." })
    } catch (error) {
      console.error("Error updating item:", error)
      toast({ title: "Error", description: "Fehler beim Aktualisieren. Bitte versuchen Sie es erneut.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={!!item} onOpenChange={() => setEditingItem(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Artikel bearbeiten</DialogTitle>
        </DialogHeader>

        {isLoadingSizes ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-size-mode"
                  checked={multipleSizes}
                  onCheckedChange={(checked) => {
                    setMultipleSizes(checked)
                    if (checked) {
                      if (sizes.length === 1 && sizes[0].size === 'Einheitsgröße') {
                        setSizes([{ ...sizes[0], size: '' }])
                      }
                    } else {
                      const totalQty = sizes.reduce((sum, s) => {
                        const q = typeof s.quantity === 'number' ? s.quantity : (parseInt(s.quantity as any) || 0)
                        return sum + q
                      }, 0)
                      setSizes([{ size: 'Einheitsgröße', quantity: totalQty || '' }])
                    }
                  }}
                />
                <Label htmlFor="edit-size-mode">Mehrere Größen</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editName">Name</Label>
                <Input
                  id="editName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editProductId">Produkt-ID</Label>
                <Input
                  id="editProductId"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                />
              </div>

              <div className="space-y-2">
                <Label>{multipleSizes ? 'Größen und Mengen' : 'Menge'}</Label>
                <div>
                  {multipleSizes ? (
                    <div className="max-h-[200px] overflow-y-auto px-1 py-1 rounded-md">
                      {sizes.map((size, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                          <Input
                            placeholder="Größe"
                            value={size.size}
                            onChange={(e) => {
                              const newSizes = [...sizes]
                              newSizes[index] = { ...newSizes[index], size: e.target.value }
                              setSizes(newSizes)
                            }}
                            className="w-1/2 h-8 text-sm focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                          />
                          <Input
                            type="number"
                            placeholder="Menge"
                            value={size.quantity === 0 ? "" : (size.quantity as any)}
                            onChange={(e) => {
                              const newSizes = [...sizes]
                              const value = e.target.value
                              newSizes[index] = { ...newSizes[index], quantity: value === "" ? "" : (parseInt(value) || 0) }
                              setSizes(newSizes)
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-1/2 h-8 text-sm focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                          {sizes.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => {
                                const newSizes = sizes.filter((_, i) => i !== index)
                                setSizes(newSizes)
                              }}
                            >
                              <X size={14} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Input
                      type="number"
                      value={
                        typeof sizes[0]?.quantity === 'number'
                          ? (sizes[0].quantity === 0 ? "" : sizes[0].quantity)
                          : (sizes[0]?.quantity as any)
                      }
                      onChange={(e) => {
                        const value = e.target.value
                        setSizes([{
                          ...sizes[0],
                          size: 'Einheitsgröße',
                          quantity: value === "" ? "" : (parseInt(value) || 0)
                        }])
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  )}

                  {multipleSizes && (
                    <Button
                      onClick={() => setSizes([...sizes, { size: '', quantity: '' }])}
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
                <Input
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
                  <Upload className="mr-2 h-4 w-4" /> Bild ändern
                </Button>
              </div>

              {imagePreview && imagePreview !== '/placeholder.svg' && (
                <div className="mt-2">
                  <Image
                    src={imagePreview}
                    alt="Vorschau"
                    width={100}
                    height={100}
                    className="object-contain"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingItem(null)}>Abbrechen</Button>
              <Button
                onClick={handleUpdate}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  'Speichern'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

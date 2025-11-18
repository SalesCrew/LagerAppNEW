import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Trash, Check } from 'lucide-react'
import Image from "next/image"

export default function PromoterItemList({
  promoterItems,
  setPromoterItems,
  selectedItem,
  setSelectedItem,
  items,
  setItems,
  promoters,
  setPromoters,
  transactionHistory,
  setTransactionHistory,
  selectionMode = false,
  selectedIds = [],
  toggleSelect
}) {
  const handleDeletePromoterItem = (itemId) => {
    const deletedItem = promoterItems.find(item => item.id === itemId)
    setPromoterItems(promoterItems.filter(item => item.id !== itemId))
    
    if (deletedItem) {
      const promoter = promoters.find(p => p.id === deletedItem.promoterId)
      if (promoter) {
        const remainingItems = promoterItems.filter(item => item.promoterId === promoter.id && item.id !== itemId)
        const uniqueItemCount = new Set(remainingItems.map(item => item.productId)).size
        setPromoters(promoters.map(p => p.id === promoter.id ? { ...p, itemCount: uniqueItemCount } : p))

        setTransactionHistory && setTransactionHistory(prev => ({
          ...prev,
          [promoter.id]: [...(prev?.[promoter.id] || []), {
            itemName: deletedItem.name,
            quantity: -deletedItem.quantity,
            size: deletedItem.size,
            date: new Date().toISOString(),
          }],
        }))

        setItems(items.map(item => {
          if (item.productId === deletedItem.productId) {
            const updatedSizes = item.sizes.map(size =>
              size.size === deletedItem.size ? { ...size, quantity: size.quantity + deletedItem.quantity } : size
            )
            return {
              ...item,
              sizes: updatedSizes,
              inCirculation: item.inCirculation - deletedItem.quantity,
              total: item.total
            }
          }
          return item
        }))
      }
    }
  }

  if (!promoterItems || promoterItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Keine Artikel gefunden.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {promoterItems.map((item) => {
        const isSelected = Array.isArray(selectedIds) && selectedIds.includes(item.id);
        return (
        <Card
          key={item.id}
          onClick={() => selectionMode && toggleSelect && toggleSelect(item.id)}
          className={`overflow-hidden transition-all ${isSelected ? 'border border-green-500 bg-green-50/40 ring-1 ring-green-500/50 shadow-[0_8px_24px_rgba(0,0,0,0.06)]' : 'border-black/5'} ${selectionMode ? 'cursor-pointer hover:bg-green-50/30' : ''}`}
        >
          <div className="relative">
            <Image
              src={item.image || '/placeholder.svg'}
              alt={item.name}
              width={300}
              height={200}
              className="w-full h-48 object-cover"
            />
            {isSelected && (
              <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full border border-green-500 bg-white/90 text-green-600 shadow-sm">
                <Check className="h-4 w-4" />
              </div>
            )}
            <div className="absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleDeletePromoterItem(item.id)}>
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Löschen</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <p className="text-sm text-gray-500">ID: {item.productId}</p>
            <p className="text-sm">Menge: {item.quantity}</p>
            <p className="text-sm">Größe: {item.size}</p>
            <p className="text-sm text-gray-500">Marke: {item.brand}</p>
          </CardContent>
        </Card>
        )})}
    </div>
  )
}


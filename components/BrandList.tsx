"use client";

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Edit, Trash, EyeOff, Pin } from 'lucide-react'
import Image from "next/image"
import { useBrands, BrandWithItemCount } from '../hooks/useBrands'
import { Skeleton } from './ui/skeleton'
import DeleteConfirmDialog from './DeleteConfirmDialog'

interface BrandListProps {
  onBrandClick: (brandId: string) => void;
  brands?: BrandWithItemCount[];
  loading?: boolean;
  onBrandUpdated: () => void;
  onEditBrand: (brand: BrandWithItemCount) => void;
}

export default function BrandList({ 
  onBrandClick, 
  brands: propBrands, 
  loading: propLoading,
  onBrandUpdated,
  onEditBrand
}: BrandListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [deletingBrand, setDeletingBrand] = useState<BrandWithItemCount | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { 
    brands: hookBrands, 
    loading: hookLoading, 
    toggleActive, 
    togglePinned, 
    removeBrand
  } = useBrands();

  // Use props if provided, otherwise use hook values
  const brands = propBrands || hookBrands;
  const loading = propLoading || hookLoading;

  const handleEdit = (brand: BrandWithItemCount) => {
    onEditBrand(brand)
  }

  const handleDeleteClick = (brand: BrandWithItemCount) => {
    setDeletingBrand(brand);
    setShowDeleteConfirmDialog(true);
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await removeBrand(id);
      onBrandUpdated();
    } catch (error) {
      console.error('Error deleting brand:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmDialog(false);
      setDeletingBrand(null);
    }
  }

  const handleToggleInactive = async (id: string) => {
    try {
      await toggleActive(id);
      onBrandUpdated();
    } catch (error) {
      console.error('Error toggling brand status:', error);
    }
  }

  const handleTogglePin = async (id: string) => {
    try {
      await togglePinned(id);
      onBrandUpdated();
    } catch (error) {
      console.error('Error toggling brand pinned status:', error);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden rounded-2xl border border-black/5">
            <Skeleton className="w-full h-56" />
            <CardContent className="p-4">
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-3 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {brands.length === 0 && !loading ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Keine Marken gefunden. Fügen Sie eine neue Marke hinzu.</p>
          </div>
        ) : (
          brands.map((brand) => (
          <Card 
              key={`brand-${brand.id}`} 
            className={`overflow-hidden cursor-pointer ${!brand.is_active ? 'opacity-60' : ''} rounded-2xl border border-black/5 bg-white transition-all duration-300 shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]`} 
              onClick={() => onBrandClick(brand.id)}
            >
              <div className="relative group">
                <div
                  className="h-56 overflow-hidden"
                  style={{
                    WebkitMaskImage:
                      'linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0.25) 100%)',
                    maskImage:
                      'linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0.25) 100%)',
                  }}
                >
                  <Image
                    src={brand.logo_url || '/placeholder-logo.png'}
                    alt={brand.name}
                    width={300}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                {brand.is_pinned && (
                  <div className="absolute top-3 left-3 rounded-full bg-white/70 backdrop-blur-sm border border-black/10 shadow-sm flex items-center justify-center h-8 w-8">
                    <Pin className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleEdit(brand)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Bearbeiten</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleDeleteClick(brand)}>
                        <Trash className="mr-2 h-4 w-4" />
                        <span>Löschen</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleToggleInactive(brand.id)}>
                        <EyeOff className="mr-2 h-4 w-4" />
                        <span>{brand.is_active ? 'Inaktiv setzen' : 'Aktiv setzen'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleTogglePin(brand.id)}>
                        <Pin className="mr-2 h-4 w-4" />
                        <span>{brand.is_pinned ? 'Entpinnen' : 'Pinnen'}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {/* Minimal translucent details */}
                <div className="absolute inset-x-3 bottom-3 rounded-lg bg-[rgba(255,255,255,0.85)] backdrop-blur-sm border border-black/10 px-3 py-2 shadow-sm text-center">
                  <h3 className="font-medium text-sm text-gray-900 truncate">{brand.name}</h3>
                  <p className="text-xs text-gray-500">Artikel: {brand.itemCount}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      <DeleteConfirmDialog
        isOpen={showDeleteConfirmDialog}
        onClose={() => setShowDeleteConfirmDialog(false)}
        onConfirm={() => deletingBrand && handleDelete(deletingBrand.id)}
        title="Marke löschen"
        description="Sind Sie sicher, dass Sie diese Marke löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
        itemName={deletingBrand?.name}
        isDeleting={isDeleting}
      />
    </>
  )
}


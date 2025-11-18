import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import BrandList from './BrandList'
import ItemList from './ItemList'
import AddBrandDialog from './AddBrandDialog'
import AddItemDialog from './AddItemDialog'
import { useBrands } from '@/hooks/useBrands'
import { useRouter } from 'next/navigation'
import EditBrandDialog from './EditBrandDialog'
import { BrandWithItemCount } from '@/hooks/useBrands'

interface BrandViewProps {
  selectedBrand: BrandWithItemCount | null;
  setSelectedBrand: (brand: BrandWithItemCount | null) => void;
  selectedItem: any;
  setSelectedItem: (item: any) => void;
  promoters: any[];
  setPromoters: (promoters: any[]) => void;
  promoterItems: any[];
  setPromoterItems: (items: any[]) => void;
  triggerRefresh: () => void;
}

export default function BrandView({
  selectedBrand,
  setSelectedBrand,
  selectedItem,
  setSelectedItem,
  promoters, 
  setPromoters, 
  promoterItems,
  setPromoterItems,
  triggerRefresh
}: BrandViewProps) {
  const [showAddBrandDialog, setShowAddBrandDialog] = useState(false)
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const [editingBrand, setEditingBrand] = useState<BrandWithItemCount | null>(null)
  const router = useRouter();
  const [isMassEditMode, setIsMassEditMode] = useState(false);
  
  const { brands, loading: brandsLoading, refreshBrands, updateBrandDetails } = useBrands();
  
  const handleBackToBrands = () => {
    setSelectedBrand(null);
    setSelectedItem(null);
    // Update URL to remove query parameters
    router.push('/inventory');
  };
  
  const handleBrandUpdated = () => {
    refreshBrands();
    triggerRefresh();
  };
  
  return (
    <>
      {selectedBrand ? (
        <>
          <div className="flex items-center justify-between mb-0">
            <Button
              variant="ghost"
              size="sm"
              className="inline-flex h-9 items-center gap-1 rounded-md px-3 border bg-white text-black border-neutral-300 hover:bg-neutral-50 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
              onClick={handleBackToBrands}
            >
              Zurück zu Marken
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className={`inline-flex h-9 items-center gap-1 rounded-md px-3 border focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none
                  ${isMassEditMode
                    ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 border-amber-700'
                    : 'bg-gradient-to-br from-amber-100/40 to-amber-200/40 text-amber-800/60 hover:from-amber-100/70 hover:to-amber-200/70 border-amber-600/40'}`}
                onClick={() => setIsMassEditMode(v => !v)}
              >
                <Plus className="h-4 w-4" /> Massenbearbeitung
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex h-9 items-center gap-1 rounded-md px-3 border bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 hover:from-emerald-100 hover:to-emerald-200 dark:from-emerald-900/20 dark:to-emerald-900/30 dark:text-emerald-300 border-emerald-600/60 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                onClick={() => setShowAddItemDialog(true)}
              >
                <Plus className="h-4 w-4" /> Neuer Artikel
              </Button>
            </div>
          </div>
          <ItemList
            key={selectedBrand.id}
            brandId={selectedBrand.id}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            promoters={promoters}
            setPromoters={setPromoters}
            promoterItems={promoterItems}
            setPromoterItems={setPromoterItems}
            triggerRefresh={triggerRefresh}
            isMassEditMode={isMassEditMode}
          />
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Marken</h2>
            <Button
              variant="ghost"
              size="sm"
              className="inline-flex h-9 items-center gap-1 rounded-md px-3 border bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 hover:from-emerald-100 hover:to-emerald-200 dark:from-emerald-900/20 dark:to-emerald-900/30 dark:text-emerald-300 border-emerald-600/60 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
              onClick={() => setShowAddBrandDialog(true)}
            >
              <Plus className="h-4 w-4" /> Neue Marke
            </Button>
          </div>
          <BrandList
            brands={brands}
            loading={brandsLoading}
            onBrandClick={(brandId) => {
              const brand = brands.find(b => b.id === brandId);
              if (brand) {
                setSelectedBrand(brand);
              }
            }}
            onBrandUpdated={handleBrandUpdated}
            onEditBrand={setEditingBrand}
          />
        </>
      )}

      {showAddBrandDialog && (
        <AddBrandDialog
          showDialog={showAddBrandDialog}
          setShowDialog={setShowAddBrandDialog}
          onSuccess={refreshBrands}
        />
      )}

      <AddItemDialog
        showDialog={showAddItemDialog && selectedBrand !== null}
        setShowDialog={setShowAddItemDialog}
        brandId={selectedBrand?.id || ''}
      />

      <EditBrandDialog
        brand={editingBrand}
        setEditingBrand={setEditingBrand}
        onUpdate={updateBrandDetails}
        onSuccess={refreshBrands}
      />
    </>
  );
}


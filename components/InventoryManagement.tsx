"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileDown, FileUp, Package, History, Plus } from 'lucide-react'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import * as XLSX from 'xlsx'
import { useInventoryData } from '../hooks/useInventoryData'
import styles from '../styles/inventory.module.css'
import BrandView from './BrandView'
import PromoterView from './PromoterView'
import SearchBar from './SearchBar'
import ImportDialog from './ImportDialog'
import ExportDialog from './ExportDialog'
import RestockSearchDialog from './RestockSearchDialog'
import RestockQuantityDialog from './RestockQuantityDialog'
import { ProfileMenu } from './ProfileMenu'
import AddBrandDialog from './AddBrandDialog'
import type { Employee } from '@/types/employee'
import { PinProvider } from '../contexts/PinContext'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUser } from '@/contexts/UserContext'
import Header from "@/components/Header"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { useBrands, BrandWithItemCount } from '@/hooks/useBrands'
import { useItems, ItemWithSizeCount } from '@/hooks/useItems'
import { usePromoters, PromoterWithDetails } from '@/hooks/usePromoters'

export default function InventoryManagement() {
  const {
    brands, setBrands,
    items, setItems,
    promoters, setPromoters,
    promoterItems, setPromoterItems,
    selectedBrand, setSelectedBrand,
    selectedPromoter, setSelectedPromoter,
    selectedItem, setSelectedItem,
    viewMode, setViewMode
  } = useInventoryData()

  const { toast } = useToast();
  const { currentUser } = useUser();
  useCurrentUser();
  const searchParams = useSearchParams();
  const { promoters: fetchedPromotersList, refreshPromoters } = usePromoters();
  const { items: fetchedItemsList, refreshItems: refreshItemsHook } = useItems(selectedBrand?.id ?? '');
  const { brands: fetchedBrandsList, refreshBrands } = useBrands();

  const [importedData, setImportedData] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showRestockSearchDialog, setShowRestockSearchDialog] = useState(false)
  const [showRestockQuantityDialog, setShowRestockQuantityDialog] = useState(false)
  const [selectedRestockItem, setSelectedRestockItem] = useState(null)
  const [showAddBrandDialog, setShowAddBrandDialog] = useState(false)

  const excelFileInputRef = useRef(null)

  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => {
    console.log("[InvMgmt] Triggering refresh by incrementing key");
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const brandId = params.get('brandId');
    const itemId = params.get('itemId');
    const promoterId = params.get('promoterId');
    const viewParam = params.get('view');

    if (brandId && fetchedBrandsList.length > 0) {
      const brand = fetchedBrandsList.find(b => b.id === brandId);
      if (brand && selectedBrand?.id !== brand.id) {
        setSelectedBrand(brand as BrandWithItemCount | null);
        setViewMode('brands');
        setSelectedPromoter(null);
      }
    }

    if (promoterId && fetchedPromotersList.length > 0) {
      const promoter = fetchedPromotersList.find(p => p.id === promoterId);
      if (promoter && selectedPromoter?.id !== promoter.id) { 
        setSelectedPromoter(promoter as PromoterWithDetails | null);
        setViewMode('promoters');
        setSelectedBrand(null); 
      }
    }

    if (!brandId && !promoterId && viewParam) {
      if (viewParam === 'promoters') {
        setViewMode('promoters');
        setSelectedBrand(null);
      } else if (viewParam === 'brands') {
        setViewMode('brands');
        setSelectedPromoter(null);
      }
    }
    
    if (itemId && fetchedItemsList.length > 0) {
        const item = fetchedItemsList.find(i => i.id === itemId);
        if (item && selectedItem?.id !== item.id) { 
           setSelectedItem(item as ItemWithSizeCount | null);
        }
    }

  }, [searchParams, fetchedBrandsList, fetchedItemsList, fetchedPromotersList, setSelectedBrand, setSelectedItem, setSelectedPromoter, setViewMode, selectedBrand, selectedItem, selectedPromoter]);

  const handleRestockSearch = (searchTerm: string) => {
    console.warn("handleRestockSearch called but seems unused");
  }

  const handleRestockSelect = (item: any) => {
    console.warn("handleRestockSelect called but seems unused");
  }

  const handleRestockConfirm = async (quantity: number, itemSizeId: string) => {
      if (!selectedRestockItem || !currentUser) return;
      try {
          console.warn("handleRestockConfirm called but recordRestock seems commented out or missing");
          setShowRestockQuantityDialog(false);
      } catch (error) { 
      }
  }

  return (
      <div className={`container mx-auto p-4 ${styles.container}`}>
        <Header />

        <div className="hidden"></div>

        {viewMode === 'brands' ? (
          <BrandView
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            promoters={promoters}
            setPromoters={setPromoters}
            promoterItems={promoterItems}
            setPromoterItems={setPromoterItems}
            triggerRefresh={triggerRefresh}
          />
        ) : (
          <PromoterView
            promoterItems={promoterItems}
            setPromoterItems={setPromoterItems}
            selectedPromoter={selectedPromoter}
            setSelectedPromoter={setSelectedPromoter}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            items={items}
            setItems={setItems}
            refreshKey={refreshKey}
            promoters={fetchedPromotersList}
            transactionHistory={{}}
            setTransactionHistory={() => {}}
          />
        )}

        {showConfirmDialog && (
          <ExportDialog
            // onClose={() => setShowConfirmDialog(false)}
          />
        )}

        {showRestockSearchDialog && (
          <RestockSearchDialog
            // onClose={() => setShowRestockSearchDialog(false)}
            showDialog={showRestockSearchDialog}
            setShowDialog={setShowRestockSearchDialog}
            onSearch={handleRestockSearch}
            onSelect={handleRestockSelect}
          />
        )}

        {showRestockQuantityDialog && selectedRestockItem && (
          <RestockQuantityDialog
            item={selectedRestockItem}
            showDialog={showRestockQuantityDialog}
            setShowDialog={setShowRestockQuantityDialog}
            onSuccess={triggerRefresh}
          />
        )}

        {showAddBrandDialog && (
          <AddBrandDialog
            showDialog={showAddBrandDialog}
            setShowDialog={setShowAddBrandDialog}
            onSuccess={triggerRefresh}
          />
        )}
      </div>
  )
}


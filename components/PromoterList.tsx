import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreVertical, Edit, Trash, EyeOff, History, Pin, Loader2 } from 'lucide-react'
import Image from "next/image"
import EditPromoterDialog from './EditPromoterDialog'
import PromoterHistoryDialog from './PromoterHistoryDialog'
import InactiveConfirmDialog from './InactiveConfirmDialog'
import DeleteConfirmDialog from './DeleteConfirmDialog'
import { usePinned } from '../hooks/usePinned'
import { Skeleton } from './ui/skeleton'
import { usePromoters, PromoterWithDetails } from '@/hooks/usePromoters'
import { getPromoterInventory } from '@/lib/api/promoters'

interface PromoterListProps {
  promoters: PromoterWithDetails[];
  onPromoterUpdated: () => void;
  onPromoterClick?: (promoter: PromoterWithDetails) => void;
}

// Auto-fit a single-line heading by shrinking font-size until it fits
function AutoFitName({ name }: { name: string }) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;

    const fit = () => {
      // Start from a comfortable size and shrink as needed
      let fontSize = 18; // ~ text-lg
      el.style.whiteSpace = 'nowrap';
      el.style.overflow = 'hidden';
      el.style.display = 'block';
      el.style.fontSize = `${fontSize}px`;

      // Reduce until it fits in one line or hit a very small floor
      while (el.scrollWidth > el.clientWidth && fontSize > 8) {
        fontSize -= 0.5;
        el.style.fontSize = `${fontSize}px`;
      }
    };

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [name]);

  return (
    <h3 ref={headingRef} className="font-semibold text-center">
      {name}
    </h3>
  );
}

export default function PromoterList({ 
  promoters,
  onPromoterUpdated,
  onPromoterClick
}: PromoterListProps) {
  const [editingPromoter, setEditingPromoter] = useState<PromoterWithDetails | null>(null)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [selectedPromoterHistory, setSelectedPromoterHistory] = useState<PromoterWithDetails | null>(null)
  const [showInactiveConfirmDialog, setShowInactiveConfirmDialog] = useState(false)
  const [inactivePromoter, setInactivePromoter] = useState<PromoterWithDetails | null>(null)
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [deletingPromoter, setDeletingPromoter] = useState<PromoterWithDetails | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [checkingInventory, setCheckingInventory] = useState<string | null>(null)
  
  // Transform promoters to match usePinned requirements
  const promotersForPinned = promoters.map(p => ({
    id: p.id,
    isActive: true // Always set to true so they're always included
  }));
  const { sortedItems: sortedPromoterIds, togglePin, isPinned } = usePinned(promotersForPinned, 'promoter');
  
  // Get the full promoter objects in the sorted order, including inactive ones
  const sortedPromoters = sortedPromoterIds
    .map(id => promoters.find(p => p.id === id.id))
    .filter((p): p is PromoterWithDetails => p !== undefined);

  const { toggleActive, removePromoter, updatePromoterDetails, loading } = usePromoters();

  const handleEdit = (promoter: PromoterWithDetails) => {
    setEditingPromoter(promoter)
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await removePromoter(id);
      onPromoterUpdated();
    } catch (error) {
      console.error('Error deleting promoter:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmDialog(false);
      setDeletingPromoter(null);
    }
  }

  const handleDeleteClick = (promoter: PromoterWithDetails) => {
    setDeletingPromoter(promoter);
    setShowDeleteConfirmDialog(true);
  }

  const handleToggleInactive = async (promoter: PromoterWithDetails) => {
    if (promoter.is_active) {
      setCheckingInventory(promoter.id);
      try {
        const inventory = await getPromoterInventory(promoter.id);
        if (inventory.length === 0) {
          await togglePromoterStatus(promoter.id);
        } else {
          setInactivePromoter(promoter);
          setShowInactiveConfirmDialog(true);
        }
      } catch (error) {
        console.error('Error checking promoter inventory:', error);
      } finally {
        setCheckingInventory(null);
      }
    } else {
      await togglePromoterStatus(promoter.id);
    }
  }

  const togglePromoterStatus = async (id: string) => {
    try {
      await toggleActive(id);
      onPromoterUpdated();
    } catch (error) {
      console.error('Error toggling promoter status:', error);
    }
  }

  const handleTogglePin = (id: string) => {
    togglePin(id);
  }

  const handleShowHistory = (promoter: PromoterWithDetails) => {
    setSelectedPromoterHistory(promoter);
    setShowHistoryDialog(true);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={`promoter-skeleton-${i}`} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="h-48">
              <Skeleton className="w-full h-full" />
            </div>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-3/4 mx-auto mb-3" />
              <div className="rounded-lg border border-neutral-200/60 bg-[rgba(255,255,255,0.85)] p-3">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              <div className="mt-3">
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedPromoters.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Keine Promoter gefunden. Fügen Sie einen neuen Promoter hinzu.</p>
          </div>
        ) : sortedPromoters.map((promoter) => (
          <Card 
            key={promoter.id} 
            className={`overflow-hidden ${!promoter.is_active ? 'opacity-50' : ''} cursor-pointer transition-all duration-300 shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]`}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('.dropdown-menu-container')) {
                return;
              }
              onPromoterClick?.(promoter);
            }}
          >
            <div className="relative group">
              <Image
                src={promoter.photo_url || '/placeholder.svg'}
                alt={promoter.name}
                width={300}
                height={200}
                className="w-full h-48 object-cover"
              />
              {isPinned(promoter.id) && (
                <Pin className="absolute top-2 left-2 h-6 w-6 text-primary" />
              )}
              <div className="absolute top-2 right-2 dropdown-menu-container">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={checkingInventory === promoter.id}>
                      {checkingInventory === promoter.id ? 
                        <Loader2 className="h-4 w-4 animate-spin" /> : 
                        <MoreVertical className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={(e) => {
                      e.preventDefault();
                      handleEdit(promoter);
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Bearbeiten</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => {
                      e.preventDefault();
                      handleDeleteClick(promoter);
                    }}>
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Löschen</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={(e) => {
                        e.preventDefault();
                        handleToggleInactive(promoter);
                      }}
                      disabled={checkingInventory === promoter.id}
                    >
                      <EyeOff className="mr-2 h-4 w-4" />
                      <span>{promoter.is_active ? 'Inaktiv setzen' : 'Aktiv setzen'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => {
                      e.preventDefault();
                      handleShowHistory(promoter);
                    }}>
                      <History className="mr-2 h-4 w-4" />
                      <span>Verlauf</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => {
                      e.preventDefault();
                      handleTogglePin(promoter.id);
                    }}>
                      <Pin className="mr-2 h-4 w-4" />
                      <span>{isPinned(promoter.id) ? 'Entpinnen' : 'Pinnen'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardContent className="p-4 flex flex-col h-full">
              <AutoFitName name={promoter.name} />

              {/* Info container - fixed fields with graceful null states */}
              <div className="mt-3 rounded-lg border border-neutral-200/60 bg-[rgba(255,255,255,0.85)] backdrop-blur-sm p-3 min-h-[180px]">
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-500">Transaktionen</span>
                    <span className="text-sm font-medium text-neutral-900 min-h-[1.25rem]">
                      {typeof promoter.transactionCount === 'number' ? promoter.transactionCount : '—'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-500">Tel</span>
                    <span className="text-sm font-medium text-neutral-900 min-h-[1.25rem] truncate">
                      {promoter.phone_number || '—'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-500">Größe</span>
                    <span className="text-sm font-medium text-neutral-900 min-h-[1.25rem]">
                      {promoter.clothing_size || '—'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-neutral-500">Adresse</span>
                    <span className="text-sm font-medium text-neutral-900 min-h-[2.5rem] break-words max-h-10 overflow-hidden">
                      {promoter.address || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-neutral-300/30 to-transparent my-3" />

              {/* Verlauf button - neutral pill */}
              <Button 
                variant="ghost"
                className="w-full h-9 rounded-md border bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShowHistory(promoter);
                }}
              >
                <History className="mr-2 h-4 w-4" />
                Verlauf
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {editingPromoter && (
        <EditPromoterDialog
          promoter={editingPromoter}
          setEditingPromoter={setEditingPromoter}
          onUpdate={onPromoterUpdated}
        />
      )}
      {showHistoryDialog && selectedPromoterHistory && (
        <PromoterHistoryDialog
          promoter={selectedPromoterHistory}
          setShowHistoryDialog={setShowHistoryDialog}
        />
      )}
      <InactiveConfirmDialog
        showDialog={showInactiveConfirmDialog}
        setShowDialog={setShowInactiveConfirmDialog}
        promoter={inactivePromoter}
        onConfirm={() => {
          if (inactivePromoter) {
            togglePromoterStatus(inactivePromoter.id)
            setInactivePromoter(null)
          }
        }}
      />
      <DeleteConfirmDialog
        isOpen={showDeleteConfirmDialog}
        onClose={() => setShowDeleteConfirmDialog(false)}
        onConfirm={() => deletingPromoter && handleDelete(deletingPromoter.id)}
        title="Promoter löschen"
        description="Sind Sie sicher, dass Sie diesen Promoter löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
        itemName={deletingPromoter?.name}
        isDeleting={isDeleting}
      />
    </>
  )
}
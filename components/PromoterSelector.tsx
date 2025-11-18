import { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromoters } from '@/hooks/usePromoters';
import { Promoter } from '@/lib/api/promoters';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddPromoterDialog from './AddPromoterDialog';
import { Input } from "@/components/ui/input";

interface PromoterSelectorProps {
  value: string;
  onChange: (promoter: Promoter | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  includeInactive?: boolean;
  colorVariant?: "violet" | "default";
  forceWhite?: boolean;
}

export default function PromoterSelector({
  value,
  onChange,
  placeholder = "Promoter auswählen",
  className,
  disabled = false,
  includeInactive = false,
  colorVariant = "default",
  forceWhite = false
}: PromoterSelectorProps) {
  const { promoters, loading, addPromoter, refreshPromoters } = usePromoters();
  const [search, setSearch] = useState("");
  
  // Debug: Log props and promoters
  useEffect(() => {
    console.log('PromoterSelector props:', { value, disabled, includeInactive });
    console.log('All promoters:', promoters);
  }, [value, disabled, includeInactive, promoters]);
  
  // Filter promoters based on active status
  const filteredPromoters = promoters
    .filter(p => includeInactive || p.is_active)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    
  // Debug: Log filtered promoters
  useEffect(() => {
    console.log('Filtered promoters:', filteredPromoters);
  }, [filteredPromoters]);

  // Handle adding a new promoter
  const handleAddPromoter = async (name: string, photoFile: File | null) => {
    await addPromoter(name, photoFile);
    await refreshPromoters();
  };
  
  // Debug: Log when dropdown opens/closes
  useEffect(() => {
    console.log('Dropdown open state:', open);
  }, [open]);

  // Handle promoter selection - find the object and pass it back
  const handleSelectPromoter = (promoterId: string) => {
    if (!promoterId) {
        onChange(null);
        return;
    }
    const foundPromoter = promoters.find(p => p.id === promoterId);
    onChange(foundPromoter || null);
  };

  // Find the name of the currently selected promoter for display
  const selectedPromoterName = value ? promoters.find(p => p.id === value)?.name : null;

  return (
    <div className={className}>
      <Select 
        value={value || ""} 
        onValueChange={handleSelectPromoter} 
        disabled={disabled || loading}
      >
        <SelectTrigger
          className={cn(
            "w-full justify-between h-9 rounded-md border focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none",
            value && colorVariant === "violet" && !forceWhite
              ? "bg-gradient-to-br from-violet-50 to-violet-100 text-violet-700 border-violet-600/60 shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
              : "bg-white text-foreground border-black/10"
          )}
        >
          <SelectValue placeholder={placeholder}>
            {selectedPromoterName || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-[260px]">
          {/* Inline search bar - keep focus, no stroke */}
          <div className="px-2 pt-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="h-8 text-sm focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          {loading ? (
            <div className="py-6 text-center">
              <Spinner className="mx-auto" />
            </div>
          ) : (
            filteredPromoters.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Keine Promoter gefunden</div>
            ) : (
              filteredPromoters.map((promoter) => (
                <SelectItem 
                  key={promoter.id} 
                  value={promoter.id} 
                  className={cn(!promoter.is_active ? "opacity-70" : "")}
                >
                  {promoter.name} {!promoter.is_active && " (Inaktiv)"}
                </SelectItem>
              ))
            )
          )}
        </SelectContent>
      </Select>

      {/* Add Promoter Dialog can remain if needed elsewhere */}
    </div>
  );
} 
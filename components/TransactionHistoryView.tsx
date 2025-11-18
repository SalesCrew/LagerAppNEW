"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { TransactionType } from '@/lib/api/transactions';
import { Brand } from '@/lib/api/brands';
import { useBrands } from '@/hooks/useBrands';
import { usePromoters } from '@/hooks/usePromoters';
import { useEmployees } from '@/hooks/useEmployees';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, ArrowLeft, ArrowRight, Search, X } from 'lucide-react';
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { debounce } from 'lodash';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from "@/components/ui/use-toast";

export default function TransactionHistoryView() {
  const {
    transactions,
    loading,
    filters,
    pagination,
    updateFilters,
    resetFilters,
    changePage,
    formatTransactionDate,
    getTransactionTypeLabel,
    getTransactionTypeColor,
    refreshTransactions
  } = useTransactionHistory();
  
  const { employees = [] } = useEmployees() || {};
  const { promoters = [] } = usePromoters() || {};
  
  const { brands = [], loading: brandsLoading, error: brandsError } = useBrands() || {};
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPromoter, setSelectedPromoter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  
  // Apply date range filter
  useEffect(() => {
    if (dateRange?.from || dateRange?.to) {
      const newFilters: any = {};
      if (dateRange.from) {
        newFilters.startDate = dateRange.from.toISOString();
      }
      if (dateRange.to) {
        newFilters.endDate = dateRange.to.toISOString();
      }
      updateFilters(newFilters);
    } else {
      updateFilters({ startDate: undefined, endDate: undefined });
    }
  }, [dateRange, updateFilters]);
  
  // Handle search input with debounce
  const debouncedSearch = debounce((term: string) => {
    updateFilters({ searchTerm: term || undefined });
  }, 300);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };
  
  // Handle transaction type filter change
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    if (value === 'all') {
      updateFilters({ transactionType: undefined });
    } else {
      updateFilters({ transactionType: value as TransactionType });
    }
  };
  
  // Handle promoter filter change
  const handlePromoterChange = (value: string) => {
    setSelectedPromoter(value);
    if (value === 'all') {
      updateFilters({ promoterId: undefined });
    } else {
      updateFilters({ promoterId: value });
    }
  };
  
  // Handle employee filter change
  const handleEmployeeChange = (value: string) => {
    setSelectedEmployee(value);
    if (value === 'all') {
      updateFilters({ employeeId: undefined });
    } else {
      updateFilters({ employeeId: value });
    }
  };
  
  // Create a map for quick brand lookup by ID
  const brandsMap = useMemo(() => {
    const map = new Map<string, string>();
    console.log("Building brandsMap with brands:", brands);
    brands.forEach(brand => {
      if (brand?.id) {
        map.set(brand.id, brand.name ?? 'Unnamed Brand');
      } else {
        console.warn('Skipping invalid brand data for map:', brand);
      }
    });
    console.log("Created brandsMap:", map);
    return map;
  }, [brands]);
  
  // Handle checkbox change for a single transaction
  const handleCheckboxChange = (transactionId: string, checked: boolean | 'indeterminate') => {
    setSelectedTransactionIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(transactionId);
      } else {
        newSet.delete(transactionId);
      }
      return newSet;
    });
  };
  
  // Reset all filters and selection
  const handleResetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setSelectedType('all');
    setSelectedPromoter('all');
    setSelectedEmployee('all');
    setSelectedTransactionIds(new Set());
    resetFilters();
  };
  
  // Get brand name from transaction, trying nested object first, then map lookup
  const getBrandName = useCallback((transaction: any): string => {
    try {
      const directName = transaction?.items?.brands?.name;
      if (directName) {
        return directName;
      }

      const brandId = transaction?.items?.brand_id;
      if (brandId) {
        const mappedName = brandsMap.get(brandId);
        if (mappedName) {
          return mappedName;
        } else {
          console.warn(`Brand name missing for transaction ${transaction.id}, brand_id: ${brandId} not found in brandsMap.`);
          return `Unknown Brand [${brandId.substring(0, 8)}...]`;
        }
      }

      return "N/A";

    } catch (error) {
      console.error(`Error getting brand name for transaction ${transaction?.id}:`, error);
      return "Fehler";
    }
  }, [brandsMap]);
  
  // Handle Word document export
  const handleExport = useCallback(() => {
    const selectedTransactions = transactions.filter(t => selectedTransactionIds.has(t.id));
    if (selectedTransactions.length === 0) {
      toast({ title: "Keine Transaktionen ausgewählt", description: "Bitte wählen Sie Transaktionen zum Exportieren aus." });
        return;
    }

    // Assume all selected transactions are for the same promoter for simplicity
    // In a real scenario, you might group by promoter or handle multiple promoters
    const promoterName = selectedTransactions[0].promoters?.name || "Unbekannter Promoter";
    const exportDate = format(new Date(), "dd.MM.yyyy");
    const filename = `Übergabe_${promoterName.replace(/\s+/g, '')}_${exportDate}.docx`;

    const itemLines = selectedTransactions.map(transaction => {
      const itemText = `${transaction.items?.name || 'N/A'}, ${formatTransactionDate(transaction.timestamp)}`;
      const typeLabel = getTransactionTypeLabel(transaction.transaction_type);
      return new Paragraph({
        // Center align the item list paragraphs
        alignment: AlignmentType.CENTER, 
        children: [
          // Keep the bullet point for structure, but the whole line will be centered
          new TextRun({ text: "- ", size: 24 }), 
          new TextRun({ text: `${itemText} - ${typeLabel}`, size: 24 })
        ],
        spacing: { after: 120 } 
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Übernahme Bestätigung SalesCrew JTI", bold: true, size: 32 })], // 16pt font size
            alignment: AlignmentType.CENTER, // Center align
            spacing: { after: 240 } // Add spacing after title
          }),
          new Paragraph({
            children: [new TextRun({ text: `Promotorname: ${promoterName}`, size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `Datum der Übergabe: ${exportDate}`, size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 }
          }),
          new Paragraph({
            children: [new TextRun({ text: "Artikel, Datum und Uhrzeit:", bold: true, size: 24 })],
            alignment: AlignmentType.CENTER, 
            spacing: { after: 120 }
          }),
          ...itemLines, // Item lines will now be centered
          new Paragraph({ // Add more space before signature
            children: [new TextRun({ text: "", size: 24 })],
            spacing: { before: 480 }
          }),
          new Paragraph({
            children: [new TextRun({ text: "Unterschrift Promotor und Unterschrift Salescrew:", size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 }
          }),
          new Paragraph({
            children: [new TextRun({ text: "______________________________", size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
        ],
      }]
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, filename);
      toast({ title: "Export erfolgreich", description: `Dokument ${filename} wurde generiert.` });
    }).catch(err => {
      console.error("Error generating document:", err);
      toast({ title: "Export fehlgeschlagen", description: "Dokument konnte nicht generiert werden.", variant: "destructive" });
    });

  }, [transactions, selectedTransactionIds, formatTransactionDate, getTransactionTypeLabel, toast]);
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
            <h1 className="text-2xl font-bold">Transaktionsverlauf</h1>
          </div>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-4">
              <div className="relative lg:col-span-3 rounded-md">
                <Input
                  placeholder="Suche nach Artikel, Produkt-ID..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1.5 h-7 w-7 p-0 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                    onClick={() => {
                      setSearchTerm('');
                      updateFilters({ searchTerm: undefined });
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <Select value={selectedType} onValueChange={handleTypeChange}>
                <SelectTrigger
                  className={cn(
                    "h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none rounded-md border lg:col-span-2",
                    selectedType === "take_out" && "bg-red-50/60 text-red-600 border-red-500",
                    selectedType === "return" && "bg-green-50/60 text-green-600 border-green-500",
                    selectedType === "burn" && "bg-amber-50/60 text-amber-600 border-amber-500",
                    selectedType === "restock" && "bg-blue-50/60 text-blue-600 border-blue-500"
                  )}
                >
                  <SelectValue placeholder="Aktionstyp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Aktionen</SelectItem>
                  <SelectItem value="take_out" className="text-red-500 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-500">Take Out</SelectItem>
                  <SelectItem value="return" className="text-green-500 data-[highlighted]:bg-green-50 data-[highlighted]:text-green-500">Return</SelectItem>
                  <SelectItem value="burn" className="text-amber-600 data-[highlighted]:bg-amber-50 data-[highlighted]:text-amber-600">Burn</SelectItem>
                  <SelectItem value="restock" className="text-blue-600 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-600">Restock</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={selectedPromoter}
                onValueChange={handlePromoterChange}
              >
                <SelectTrigger
                  className={cn(
                    "h-9 rounded-md border focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none lg:col-span-2",
                    selectedPromoter !== "all" &&
                      "bg-gradient-to-br from-violet-50 to-violet-100 text-violet-700 border-violet-600/60"
                  )}
                >
                  <SelectValue placeholder="Promoter wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Promoter</SelectItem>
                  {promoters && promoters.length > 0 && promoters.map(promoter => (
                    <SelectItem key={promoter.id} value={promoter.id}>
                      {promoter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Zeitraum auswählen - compact button */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-inline"
                    variant="outline"
                    className={cn(
                      "h-9 rounded-md border justify-start text-left focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none lg:col-span-2",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd.MM.yy", { locale: de })} -{" "}
                          {format(dateRange.to, "dd.MM.yy", { locale: de })}
                        </>
                      ) : (
                        format(dateRange.from, "dd.MM.yy", { locale: de })
                      )
                    ) : (
                      <span>Zeitraum</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={de}
                  />
                  <div className="p-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => setDateRange(undefined)} className="w-full">
                      Auswahl löschen
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
                <SelectTrigger className="h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none rounded-md border lg:col-span-3">
                  <SelectValue placeholder="Mitarbeiter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Mitarbeiter</SelectItem>
                  {employees && employees.length > 0 && employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} ({employee.initials})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center justify-end">
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="h-9 rounded-md border text-red-600 bg-red-500/10 hover:bg-red-500/15 border-red-500 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
              >
                Filter zurücksetzen
              </Button>
              
              <Button
                onClick={() => refreshTransactions()}
                className="h-9 rounded-md border text-green-600 bg-green-500/10 hover:bg-green-500/15 border-green-500 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
              >
                Aktualisieren
              </Button>

              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={selectedTransactionIds.size === 0}
                className="h-9 focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
              >
                ÜB exportieren
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            {loading || brandsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          
                        </TableHead>
                        <TableHead className="w-[180px]">Datum</TableHead>
                        <TableHead>Artikel</TableHead>
                        <TableHead>Marke</TableHead>
                        <TableHead>Menge</TableHead>
                        <TableHead>Größe</TableHead>
                        <TableHead>Aktion</TableHead>
                        <TableHead>Promoter</TableHead>
                        <TableHead>Mitarbeiter</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!transactions || transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                            Keine Transaktionen gefunden
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((transaction: any) => {
                          const type = transaction.transaction_type as string;
                          const bgClass =
                            type === 'take_out'
                              ? 'bg-[linear-gradient(to_right,rgba(255,255,255,1)_65%,rgba(239,68,68,0.05)_100%)]' // red-500 @5%
                              : type === 'return'
                                ? 'bg-[linear-gradient(to_right,rgba(255,255,255,1)_65%,rgba(34,197,94,0.05)_100%)]' // green-500 @5%
                                : type === 'burn'
                                  ? 'bg-[linear-gradient(to_right,rgba(255,255,255,1)_65%,rgba(245,158,11,0.05)_100%)]' // amber-500 @5%
                                  : type === 'restock'
                                    ? 'bg-[linear-gradient(to_right,rgba(255,255,255,1)_65%,rgba(59,130,246,0.05)_100%)]' // blue-500 @5%
                                    : '';
                          return (
                          <TableRow key={transaction.id} className={bgClass}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTransactionIds.has(transaction.id)}
                                onCheckedChange={(checked) => handleCheckboxChange(transaction.id, checked)}
                                aria-label={`Select transaction ${transaction.id}`}
                              />
                            </TableCell>
                            <TableCell>{formatTransactionDate(transaction.timestamp)}</TableCell>
                            <TableCell>{transaction.items?.name || 'N/A'}</TableCell>
                            <TableCell>{getBrandName(transaction)}</TableCell>
                            <TableCell>{transaction.quantity}</TableCell>
                            <TableCell>{transaction.item_sizes?.size || 'N/A'}</TableCell>
                            <TableCell className={getTransactionTypeColor(transaction.transaction_type)}>
                              {getTransactionTypeLabel(transaction.transaction_type)}
                            </TableCell>
                            <TableCell>
                              {transaction.promoters?.name || (transaction.transaction_type === 'restock' ? 'Lager' : '-')}
                            </TableCell>
                            <TableCell>{transaction.employees?.initials || '-'}</TableCell>
                          </TableRow>
                        )})
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Seite {pagination.currentPage} von {pagination.totalPages} ({pagination.totalCount} Einträge)
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(pagination.currentPage - 1)}
                        disabled={pagination.currentPage <= 1}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(pagination.currentPage + 1)}
                        disabled={pagination.currentPage >= pagination.totalPages}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
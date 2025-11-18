"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionType } from '@/lib/api/transactions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface PromoterHistoryDialogProps {
  promoter: {
    id: string;
    name: string;
  };
  setShowHistoryDialog: (show: boolean) => void;
}

export default function PromoterHistoryDialog({ promoter, setShowHistoryDialog }: PromoterHistoryDialogProps) {
  const { getPromoterHistoryDetailed } = useTransactions();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1
  });

  // Load transaction history
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        // Prepare filters
        const filters: any = {};
        if (transactionType) {
          filters.transactionType = transactionType;
        }
        if (dateRange.from) {
          filters.startDate = dateRange.from.toISOString();
        }
        if (dateRange.to) {
          filters.endDate = dateRange.to.toISOString();
        }
        
        // Fetch transactions with filters
        const result = await getPromoterHistoryDetailed(
          promoter.id, 
          filters, 
          pagination.currentPage
        );
        
        if (result) {
          setTransactions(result.transactions);
          setPagination({
            totalCount: result.totalCount,
            totalPages: result.totalPages,
            currentPage: result.currentPage
          });
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (promoter?.id) {
      fetchTransactions();
    }
  }, [promoter, getPromoterHistoryDetailed, transactionType, dateRange, pagination.currentPage]);

  // Reset filters
  const resetFilters = () => {
    setTransactionType(null);
    setDateRange({ from: null, to: null });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Change page
  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) {
      return;
    }
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  // Format transaction date
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get transaction type display
  const getTransactionTypeDisplay = (type: TransactionType) => {
    switch (type) {
      case 'take_out':
        return 'Take Out';
      case 'return':
        return 'Return';
      case 'burn':
        return 'Burn';
      case 'restock':
        return 'Restock';
      default:
        return type;
    }
  };

  // Get transaction type color
  const getTransactionTypeColor = (type: TransactionType) => {
    switch (type) {
      case 'take_out':
        return 'text-red-500';
      case 'return':
        return 'text-green-500';
      case 'burn':
        return 'text-orange-500';
      case 'restock':
        return 'text-blue-500';
      default:
        return '';
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => setShowHistoryDialog(false)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Verlauf für {promoter.name}</DialogTitle>
        </DialogHeader>
        
        <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Select 
                value={transactionType || "all"} 
                onValueChange={(value) => setTransactionType(value === "all" ? null : value as TransactionType)}
              >
                <SelectTrigger
                  className={cn(
                    "w-[140px] h-9 rounded-md border focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none",
                    transactionType === "take_out" && "bg-gradient-to-br from-red-50/60 to-red-100/60 text-red-500 border-red-500 shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
                    transactionType === "return" && "bg-gradient-to-br from-green-50/60 to-green-100/60 text-green-600 border-green-500 shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
                    transactionType === "burn" && "bg-gradient-to-br from-amber-50/60 to-amber-100/60 text-amber-600 border-amber-500 shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
                    (!transactionType) && "bg-white text-foreground border-neutral-300"
                  )}
                >
                  <SelectValue placeholder="Aktion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Aktionen</SelectItem>
                  <SelectItem value="take_out" className="text-red-500 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-500">Take Out</SelectItem>
                  <SelectItem value="return" className="text-green-500 data-[highlighted]:bg-green-50 data-[highlighted]:text-green-500">Return</SelectItem>
                  <SelectItem value="burn" className="text-amber-600 data-[highlighted]:bg-amber-50 data-[highlighted]:text-amber-600">Burn</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[180px] h-9 justify-start text-left font-normal rounded-md border focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd.MM.yy", { locale: de })} -{" "}
                          {format(dateRange.to, "dd.MM.yy", { locale: de })}
                        </>
                      ) : (
                        format(dateRange.from, "dd.MM.yyyy", { locale: de })
                      )
                    ) : (
                      "Datum auswählen"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from || undefined}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    locale={de}
                    className="w-[280px]"
                  />
                </PopoverContent>
              </Popover>
              
              <Button
                onClick={resetFilters}
                className="w-[140px] h-9 rounded-md border text-red-600 bg-red-500/10 hover:bg-red-500/15 border-red-500 shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 outline-none"
              >
                Filter zurücksetzen
              </Button>
            </div>
            
            <div className="mt-4 max-h-[60vh] overflow-auto">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Artikel</TableHead>
                        <TableHead>Menge</TableHead>
                        <TableHead>Größe</TableHead>
                        <TableHead>Aktion</TableHead>
                        <TableHead>Mitarbeiter</TableHead>
                        <TableHead>Notizen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            Keine Transaktionen gefunden
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                            <TableCell>{transaction.items.name}</TableCell>
                            <TableCell>{transaction.quantity}</TableCell>
                            <TableCell>{transaction.item_sizes.size}</TableCell>
                            <TableCell className={getTransactionTypeColor(transaction.transaction_type)}>
                              {getTransactionTypeDisplay(transaction.transaction_type)}
                            </TableCell>
                            <TableCell>{transaction.employees.initials}</TableCell>
                            <TableCell>{transaction.notes || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  
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
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ProfileMenu } from "./ProfileMenu";
import { History, List, Package } from "lucide-react";
import SearchBar from "./SearchBar";

export default function Header() {
  const path = usePathname() || "";
  const sp = useSearchParams();

  const isInventory = path.startsWith("/inventory");
  const currentView = sp?.get("view");
  const isPromotersView = currentView === "promoters" || !!sp?.get("promoterId");
  const isBrandsView = isInventory && !isPromotersView;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-4 md:mb-6">
      <div className="container flex h-14 items-center justify-between gap-3">
        <nav className="flex items-center gap-3 text-sm font-medium">
          {/* Primary view switch (left) */}
          <Link
            href={{ pathname: "/inventory", query: { view: "brands" } }}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md px-3 border transition-colors focus:outline-none focus-visible:outline-none",
              isBrandsView
                ? "bg-black/10 text-black border-black hover:bg-black/15"
                : "bg-white text-black border-neutral-300 hover:bg-neutral-50"
            )}
          >
            <Package className="h-4 w-4" />
            <span>Marken & Artikel</span>
          </Link>
          <Link
            href={{ pathname: "/inventory", query: { view: "promoters" } }}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md px-3 border transition-colors focus:outline-none focus-visible:outline-none",
              isPromotersView
                ? "bg-black/10 text-black border-black hover:bg-black/15"
                : "bg-white text-black border-neutral-300 hover:bg-neutral-50"
            )}
          >
            <History className="h-4 w-4" />
            <span>Promotoren</span>
          </Link>

          {/* Divider with fade (0% -> 100% -> 0%) */}
          <div className="mx-2 h-6 w-px bg-gradient-to-b from-transparent via-foreground/25 to-transparent" />

          {/* Secondary nav */}
          <Link
            href="/transactions"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3 transition-colors focus:outline-none focus-visible:outline-none border",
              path === "/transactions"
                ? "bg-blue-600 text-white shadow-sm border-blue-600"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 border-blue-600/60"
            )}
          >
            <History className="h-4 w-4" />
            <span>Transaktionen</span>
          </Link>
          <Link
            href="/alle-items"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3 transition-colors focus:outline-none focus-visible:outline-none border",
              path === "/alle-items"
                ? "bg-emerald-600 text-white shadow-sm border-emerald-600"
                : "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 hover:from-emerald-100 hover:to-emerald-200 dark:from-emerald-900/20 dark:to-emerald-900/30 dark:text-emerald-300 border-emerald-600/60"
            )}
          >
            <List className="h-4 w-4" />
            <span>Alle Items</span>
          </Link>
        </nav>

        {/* Right side: search and profile */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="flex-1 max-w-lg mr-2">
            <SearchBar />
          </div>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}


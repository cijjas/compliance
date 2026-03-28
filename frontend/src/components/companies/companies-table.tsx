"use client";

import { MoreVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { getCountryName, getIndustryName, getInitials } from "@/lib/constants";
import type { Business } from "@/types";

interface CompaniesTableProps {
  businesses: Business[];
  onViewDetail: (id: string) => void;
}

export function CompaniesTable({ businesses, onViewDetail }: CompaniesTableProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-ambient">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-label-caps text-on-surface-variant font-semibold py-4 px-6">
              Company Name
            </TableHead>
            <TableHead className="text-label-caps text-on-surface-variant font-semibold py-4">
              CUIT/Tax ID
            </TableHead>
            <TableHead className="text-label-caps text-on-surface-variant font-semibold py-4">
              Country
            </TableHead>
            <TableHead className="text-label-caps text-on-surface-variant font-semibold py-4">
              Industry
            </TableHead>
            <TableHead className="text-label-caps text-on-surface-variant font-semibold py-4">
              Status
            </TableHead>
            <TableHead className="text-label-caps text-on-surface-variant font-semibold py-4 text-right pr-6">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {businesses.map((biz) => (
            <TableRow
              key={biz.id}
              className="cursor-pointer hover:bg-surface-container-low/50 transition-colors"
              onClick={() => onViewDetail(biz.id)}
              style={{ borderBottom: "1px solid var(--outline-variant)" }}
            >
              <TableCell className="py-4 px-6">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 size-9 rounded-full bg-surface-container-high flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {getInitials(biz.name)}
                    </span>
                  </div>
                  <span className="font-medium text-on-surface text-sm">
                    {biz.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-4 text-data text-sm text-on-surface-variant">
                {biz.taxIdentifier}
              </TableCell>
              <TableCell className="py-4 text-sm text-on-surface-variant">
                {getCountryName(biz.country)}
              </TableCell>
              <TableCell className="py-4 text-sm text-on-surface-variant">
                {getIndustryName(biz.industry)}
              </TableCell>
              <TableCell className="py-4">
                <StatusBadge status={biz.status} />
              </TableCell>
              <TableCell className="py-4 text-right pr-6">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex items-center justify-center size-7 rounded-md text-on-surface-variant hover:bg-muted cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass shadow-ambient-lg">
                    <DropdownMenuItem onClick={() => onViewDetail(biz.id)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>View Documents</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React from "react";

// Dummy Example: expand as you add real filter and sorting logic
const sortOptions = [
  { value: "default", label: "Default sorting" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A-Z" },
  { value: "name-desc", label: "Name: Z-A" },
];

const filterOptions = [
  { value: "all", label: "All" },
  { value: "under-1000", label: "Under ₹1000" },
  { value: "1000-2000", label: "₹1000 - ₹2000" },
  // Add more filters as required
];

type ProductSortFilterBarProps = {
  sortValue: string;
  filterValue: string;
  onSortChange: (value: string) => void;
  onFilterChange: (value: string) => void;
};

const ProductSortFilterBar: React.FC<ProductSortFilterBarProps> = ({
  sortValue, filterValue, onSortChange, onFilterChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center md:justify-between gap-3 mb-8">
      <div className="flex items-center gap-2">
        <span className="font-medium text-neutral-700">Sort By:</span>
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger className="w-44 bg-white border-neutral-300">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-neutral-700">Filter:</span>
        <Select value={filterValue} onValueChange={onFilterChange}>
          <SelectTrigger className="w-44 bg-white border-neutral-300">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ProductSortFilterBar;

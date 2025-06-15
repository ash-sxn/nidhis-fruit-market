
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React from "react";

const sortOptions = [
  { value: "default", label: "Default sorting" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A-Z" },
  { value: "name-desc", label: "Name: Z-A" },
];

type ProductSortBarProps = {
  sortValue: string;
  onSortChange: (value: string) => void;
};

const ProductSortFilterBar: React.FC<ProductSortBarProps> = ({
  sortValue, onSortChange,
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
    </div>
  );
};

export default ProductSortFilterBar;


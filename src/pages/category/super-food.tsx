
import React from "react";
import CategoryLayout from "@/components/CategoryLayout";
import ProductSortFilterBar from "@/components/ProductSortFilterBar";
import CategoryPageTemplate from "./CategoryPageTemplate";

export default function SuperFoodPage() {
  const [sort, setSort] = React.useState("default");
  const [filter, setFilter] = React.useState("all");

  return (
    <CategoryLayout>
      <div className="min-h-[20vh] flex flex-col items-center justify-center mb-6">
        <h1 className="text-3xl md:text-5xl font-bold font-playfair text-green mb-2">
          Super Food
        </h1>
        <p className="text-lg text-neutral-700 max-w-2xl text-center">
          Discover our selection of nutritious superfoods.
        </p>
      </div>
      <ProductSortFilterBar
        sortValue={sort}
        filterValue={filter}
        onSortChange={setSort}
        onFilterChange={setFilter}
      />
      <CategoryPageTemplate title="Super Food" />
    </CategoryLayout>
  );
}

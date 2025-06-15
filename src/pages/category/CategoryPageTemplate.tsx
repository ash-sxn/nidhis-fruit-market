
import React from "react";

interface CategoryPageTemplateProps {
  title: string;
}

const CategoryPageTemplate: React.FC<CategoryPageTemplateProps> = ({ title }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center">
    <h1 className="text-3xl md:text-5xl font-bold font-playfair text-green mb-4">{title}</h1>
    <p className="text-lg text-neutral-700">Explore our exclusive collection for {title}.</p>
  </div>
);

export default CategoryPageTemplate;

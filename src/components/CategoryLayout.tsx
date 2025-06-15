
import React from "react";
import Header from "./Header";
import Footer from "./Footer";

type Props = {
  children: React.ReactNode;
};

const CategoryLayout: React.FC<Props> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background font-inter">
      <Header />
      <main className="flex-1 w-full max-w-[1500px] mx-auto">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default CategoryLayout;

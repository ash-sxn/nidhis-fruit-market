import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DiwaliGiftingPage from "./pages/category/diwali-gifting";
import DryFruitsComboPage from "./pages/category/dry-fruits-combo";
import FestivalGiftingPage from "./pages/category/festival-gifting";
import FlavourMakhanaPage from "./pages/category/flavour-makhana";
import NidhisDryFruitsPage from "./pages/category/nidhis-dry-fruits";
import NidhisSpicesPage from "./pages/category/nidhis-spices";
import NidhisWholeSpicesPage from "./pages/category/nidhis-whole-spices";
import SuperFoodPage from "./pages/category/super-food";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* Category Pages */}
          <Route path="/category/diwali-gifting" element={<DiwaliGiftingPage />} />
          <Route path="/category/dry-fruits-combo" element={<DryFruitsComboPage />} />
          <Route path="/category/festival-gifting" element={<FestivalGiftingPage />} />
          <Route path="/category/flavour-makhana" element={<FlavourMakhanaPage />} />
          <Route path="/category/nidhis-dry-fruits" element={<NidhisDryFruitsPage />} />
          <Route path="/category/nidhis-spices" element={<NidhisSpicesPage />} />
          <Route path="/category/nidhis-whole-spices" element={<NidhisWholeSpicesPage />} />
          <Route path="/category/super-food" element={<SuperFoodPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

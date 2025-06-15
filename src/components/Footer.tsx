
import { Instagram, Facebook, Mail, Phone, Github } from "lucide-react";

const Footer = () => (
  <footer className="bg-neutral-100 pt-12 pb-6">
    <div className="container max-w-6xl mx-auto grid md:grid-cols-4 gap-8 px-4">
      {/* Brand */}
      <div className="col-span-2">
        <div className="flex items-center gap-2 mb-3 text-xl text-saffron font-playfair font-bold">
          <span role="img" aria-label="dry fruit">🥭</span> Nidhis Dry Fruits
        </div>
        <p className="text-neutral-700 max-w-md leading-relaxed mb-2">
          Bringing you the best of Indian dry fruits, spices, and health gifts. Tradition, purity, and trust – since 1987.
        </p>
        <div className="flex gap-3 mt-3">
          <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-saffron hover:text-green text-xl"><Instagram /></a>
          <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-saffron hover:text-green text-xl"><Facebook /></a>
          <a href="mailto:info@nidhisdryfruits.com" className="text-saffron hover:text-green text-xl"><Mail /></a>
        </div>
      </div>
      {/* Links */}
      <div>
        <h4 className="font-bold text-saffron mb-3">Quick Links</h4>
        <ul className="space-y-2 text-neutral-700">
          <li><a href="#" className="hover:text-saffron transition-colors">Home</a></li>
          <li><a href="#" className="hover:text-saffron transition-colors">Categories</a></li>
          <li><a href="#" className="hover:text-saffron transition-colors">About Us</a></li>
          <li><a href="#" className="hover:text-saffron transition-colors">Contact</a></li>
        </ul>
      </div>
      {/* Contact */}
      <div>
        <h4 className="font-bold text-saffron mb-3">Contact Us</h4>
        <ul className="space-y-2 text-neutral-700 text-sm">
          <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +91-12345-67890</li>
          <li><Mail className="inline w-4 h-4 mr-1" /> support@nidhisdryfruits.com</li>
          <li>123 Spice Lane, Mumbai, India</li>
        </ul>
      </div>
    </div>
    <div className="container max-w-6xl mx-auto mt-8 border-t border-neutral-300 pt-4 flex flex-col md:flex-row items-center justify-between text-neutral-500 text-sm px-4">
      <span>© {new Date().getFullYear()} Nidhis Dry Fruits. All rights reserved.</span>
      <span>
        Crafted with <span className="text-saffron">♥</span> by Nidhis Team. 
        <a href="https://github.com/" className="ml-2 hover:text-saffron" target="_blank" rel="noopener noreferrer"><Github className="inline w-5 h-5" /></a>
      </span>
    </div>
  </footer>
);

export default Footer;

import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header
      className={`text-white shadow-lg flex items-center border-b z-30 ${
        isMenuOpen ? "border-transparent" : " border-accent/30"
      } relative`}
    >
      Hello menu
    </header>
  );
}
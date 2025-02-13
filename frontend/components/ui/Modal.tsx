// components/Modal.tsx
"use client";

import React, { ReactNode, useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "@/styles/modal.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const [mounted, setMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Bu kod yalnızca istemci tarafında çalışır.
    setModalRoot(document.getElementById("modal-root"));
    setMounted(true);
  }, []);

  if (!mounted || !modalRoot || !isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          X
        </button>
        {children}
      </div>
    </div>,
    modalRoot,
  );
};

export { Modal };

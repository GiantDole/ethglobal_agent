"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterWrapper() {
  return (
    <Toaster
      position="top-left"
      toastOptions={{
        style: {
          backgroundColor: "black",
          color: "white",
          borderRadius: "0px",
          border: "1px solid #FF8585",
          fontSize: "16px",
          fontWeight: "normal",
        },
      }}
    />
  );
}

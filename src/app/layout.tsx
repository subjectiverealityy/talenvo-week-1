import type { Metadata } from "next";
import { ToastProvider } from "@/context/ToastContext";
import "@/app/styles/globals.css";

export const metadata: Metadata = {
  title: "BoardList - Talenvo Project",
  description: "Ogechukwu Onuora's submission to the Talenvo Global Residency Program's week 2 task",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
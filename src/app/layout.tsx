import type { Metadata } from "next";
import "./globals.css";
import { WorkspaceProvider } from "./store/workspaceStore";

export const metadata: Metadata = {
  title: "BoardList - Talenvo Project (Week 1)",
  description: "Ogechukwu Onuora's submission to the Talenvo Global Residency Program's week 1 task",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  );
}
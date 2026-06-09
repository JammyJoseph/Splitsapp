import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/Confirm";

export const metadata: Metadata = {
  title: "Tracklock — Lock your splits before the song leaves the room",
  description:
    "Create a track. Add collaborators. Set the splits. Everyone signs. Split locked. The split-locking platform for music collaborators.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08080a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

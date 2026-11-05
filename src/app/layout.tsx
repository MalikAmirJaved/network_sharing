import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Netword — Share anything on your network",
    template: "%s · Netword",
  },
  description:
    "Turn your local network into a private sharing space. Drop files, text, and links — instantly available to every device in the room. No cloud, no accounts, no upload limits.",
  applicationName: "Netword",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Netword",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Netword — Share anything on your network",
    description:
      "Private, instant file and text sharing across the devices on your network.",
    type: "website",
    siteName: "Netword",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05080f" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6fc" },
  ],
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("netword-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (error) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <div className="app-bg" aria-hidden="true" />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

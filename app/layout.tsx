import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { getSession } from "@/lib/session";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ST Benateeta Kava Bar Income Tracker",
  description: "Track daily income, expenses, and profit for your kava bar business",
  manifest: "/manifest.json",
  applicationName: "ST Benateeta Kava Bar",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kava Bar",
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#6c5ce7",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6c5ce7" },
    { media: "(prefers-color-scheme: dark)", color: "#6c5ce7" },
  ],
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const showNav = session !== null;

  return (
    <html lang="en">
      <head>
        {/* iOS Safari */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kava Bar" />

        {/* Windows/Microsoft */}
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <meta name="msapplication-TileColor" content="#6c5ce7" />
        <meta name="msapplication-config" content="none" />

        {/* Android Chrome */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />

        {/* Prevent auto-detection */}
        <meta name="format-detection" content="telephone=no" />

        {/* Safe area for notched devices */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --sat: env(safe-area-inset-top);
            --sar: env(safe-area-inset-right);
            --sab: env(safe-area-inset-bottom);
            --sal: env(safe-area-inset-left);
          }
          body {
            padding-top: var(--sat);
            padding-right: var(--sar);
            padding-bottom: var(--sab);
            padding-left: var(--sal);
          }
        `}} />
      </head>
      <body className={inter.className}>
        {showNav && <Navigation />}
        {children}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                      // Check for updates
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New content available
                            console.log('New content available, please refresh');
                          }
                        });
                      });
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }

              // Handle iOS standalone mode
              if (window.navigator.standalone === true) {
                document.documentElement.classList.add('ios-standalone');
              }

              // Handle Android TWA/PWA
              if (window.matchMedia('(display-mode: standalone)').matches) {
                document.documentElement.classList.add('pwa-standalone');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

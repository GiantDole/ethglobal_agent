import "../styles/globals.css";
import PrivyProvider from "../components/utils/privy-provider";
import { Metadata } from "next";
import localFont from "next/font/local";
import Head from "next/head";

// Components
import { Header, Footer } from "@/components/ui";

export const metadata: Metadata = {
  title: "bouncer.ai",
  description: "bouncer.ai is a platform that allows anyone to launch tokens or communities while ensuring access and allocation are managed by an AI bouncer. Users interact with the bouncer via voice, and it intelligently decides who gets in, how many tokens they receive, and at what cost.",
  icons: {
    icon: "/favicons/star.png",
  },
  openGraph: {
    title: 'bouncer.ai',
    description:
      'bouncer.ai is a platform that allows anyone to launch tokens or communities while ensuring access and allocation are managed by an AI bouncer. Users interact with the bouncer via voice, and it intelligently decides who gets in, how many tokens they receive, and at what cost.',
    url: 'https://bouncer-ai.xyz',
    siteName: 'https://bouncer-ai.xyz',
    images: [
      {
        url: '/favicons/star.png', // Path relative to the public directory
        width: 1200,
        height: 630,
        alt: 'bouncer.ai - The AI bouncer platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bouncer.ai',
    description:
      'bouncer.ai is a platform that allows anyone to launch tokens or communities while ensuring access and allocation are managed by an AI bouncer. Users interact with the bouncer via voice, and it intelligently decides who gets in, how many tokens they receive, and at what cost.',
    creator: '@bouncer_ai',
    images: ['/favicons/star.png'],
  },
};

const adelleSans = localFont({
  src: [
    {
      path: "../public/fonts/AdelleSans-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/AdelleSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/AdelleSans-Semibold.woff",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/AdelleSans-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${adelleSans.className}`}>
      <Head>
        <link rel="icon" href="/favicons/favicon.ico" sizes="any" />
      </Head>
      <body>
        <PrivyProvider>
          <div className="pt-24">
            <Header />
            {children}
            <Footer />
          </div>
        </PrivyProvider>
      </body>
    </html>
  );
}

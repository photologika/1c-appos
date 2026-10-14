import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Sans_JP, Noto_Sans_KR, Inter } from "next/font/google";
import "./globals.css";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';

const inter = Inter({ subsets: ["latin"] });
const notoSansSC = Noto_Sans_SC({ weight: ["400", "700"], subsets: ["latin"] });
const notoSansJP = Noto_Sans_JP({ weight: ["400", "700"], subsets: ["latin"] });
const notoSansKR = Noto_Sans_KR({ weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PhotoStreet",
  description: "Platform for street photographers",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const { locale } = await params;

  let fontClass = inter.className;
  if (locale === 'zh') fontClass = notoSansSC.className;
  if (locale === 'ja') fontClass = notoSansJP.className;
  if (locale === 'ko') fontClass = notoSansKR.className;

  let messages;
  try {
    messages = await getMessages({locale});
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className={`${fontClass} bg-gray-50 min-h-screen text-gray-900 flex flex-col`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

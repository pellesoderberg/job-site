import DeployButton from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { NotificationProvider } from "@/components/notification-context";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NotificationProvider>
            <main className="min-h-screen flex flex-col items-center">
              <div className="flex-1 w-full flex flex-col gap-20 items-center">
                <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
                  <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                    <div className="flex gap-5 items-center font-semibold">
                      <Link href={"/"}>
                        <img 
                          src="/logo_job_site.png" 
                          alt="Job Site Logo" 
                          width={80} 
                          height={10} 
                          className="object-contain"
                        />
                      </Link>
                      <div className="flex items-center gap-2">
                      </div>
                    </div>
                    {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                  </div>
                </nav>
                <div className="flex flex-col gap-20 max-w-5xl p-5">
                  {children}
                </div>

                <footer className="w-full bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <div className="max-w-6xl mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      {/* Company Info */}
                      <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center mb-4">
                          <img 
                            src="/logo_job_site.png" 
                            alt="Job Site Logo" 
                            width={60} 
                            height={8} 
                            className="object-contain"
                          />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                          Din plattform för att hitta och publicera jobbannonser. Enkelt, snabbt och effektivt.
                        </p>
                        <div className="flex space-x-4">
                          <ThemeSwitcher />
                        </div>
                      </div>

                      {/* Quick Links */}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Snabblänkar</h3>
                        <ul className="space-y-2">
                          <li>
                            <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              Hem
                            </Link>
                          </li>
                          <li>
                            <Link href="/protected" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              Sök jobb
                            </Link>
                          </li>
                          <li>
                            <Link href="/protected/create-ad" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              Skapa annons
                            </Link>
                          </li>
                          <li>
                            <Link href="/protected/user-profile" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              Min profil
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Support */}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
                        <ul className="space-y-2">
                          <li>
                            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              Hjälp
                            </a>
                          </li>
                          <li>
                            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              Kontakt
                            </a>
                          </li>
                          <li>
                            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              Integritetspolicy
                            </a>
                          </li>
                          <li>
                            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                              Användarvillkor
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                      <div className="text-gray-600 dark:text-gray-400 text-sm mb-4 md:mb-0">
                        © 2024 Job Site. Alla rättigheter förbehållna.
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Powered by</span>
                        <a
                          href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
                          target="_blank"
                          className="font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          rel="noreferrer"
                        >
                          Supabase
                        </a>
                        <span>•</span>
                        <a
                          href="https://nextjs.org"
                          target="_blank"
                          className="font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          rel="noreferrer"
                        >
                          Next.js
                        </a>
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            </main>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

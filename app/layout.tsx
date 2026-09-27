import "./globals.css";
import ClientErrorCapture from "@/components/ClientErrorCapture";

export const metadata = {
  title: "RFCM CBT",
  description: "Reconciled Family of Christ Mission — Sunday School Examination",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientErrorCapture />
        {children}
      </body>
    </html>
  );
}

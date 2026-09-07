import "./globals.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thaarei Fleet" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

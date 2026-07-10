import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Manifest",
    description: "Your internal document intelligence workspace",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    );
}
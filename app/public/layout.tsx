import '../globals.css'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <body>
                <div className="flex flex-col h-screen">
                    {children}
                </div>
            </body>
        </html>
    );
}

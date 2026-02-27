export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAFA]">
            <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white border-r">
                <div className="max-w-md w-full">
                    <div className="mb-8 cursor-default flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-[#FF6B35]"></div>
                        <span className="font-bold text-xl tracking-tight text-[#1A1A1A]">PostChef</span>
                    </div>
                    {children}
                </div>
            </div>
            <div className="hidden md:flex flex-1 flex-col justify-center items-center bg-[#1A1A1A] p-12 text-white">
                <div className="max-w-md">
                    <h1 className="text-4xl font-bold mb-6">Automate your restaurant's social presence.</h1>
                    <p className="text-gray-400 text-lg">PostChef generates beautiful branded content and captions tailored for your local audience.</p>
                </div>
            </div>
        </div>
    )
}

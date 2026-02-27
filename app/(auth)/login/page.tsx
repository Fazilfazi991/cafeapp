import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default function Login({ searchParams }: { searchParams: { message: string } }) {
    const signIn = async (formData: FormData) => {
        'use server'

        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const supabase = createClient()

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return redirect(`/login?message=${encodeURIComponent(error.message)}`)
        }

        return redirect('/dashboard')
    }

    return (
        <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
            <form
                className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground"
                action={signIn}
            >
                <h2 className="text-3xl font-bold mb-6 text-[#1A1A1A]">Welcome back to PostChef</h2>

                <label className="text-md font-medium text-[#1A1A1A]" htmlFor="email">
                    Email
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-4 focus:outline-none focus:border-[#FF6B35]"
                    name="email"
                    placeholder="you@example.com"
                    required
                />

                <label className="text-md font-medium text-[#1A1A1A]" htmlFor="password">
                    Password
                </label>
                <input
                    className="rounded-md px-4 py-2 bg-inherit border mb-4 focus:outline-none focus:border-[#FF6B35]"
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                />

                <button className="bg-[#FF6B35] rounded-md px-4 py-2 text-white mb-2 font-medium hover:bg-orange-600 transition-colors">
                    Sign In
                </button>

                {searchParams?.message && (
                    <p className="mt-4 p-4 bg-red-100 text-red-600 text-center rounded-md text-sm">
                        {searchParams.message}
                    </p>
                )}
            </form>
        </div>
    )
}

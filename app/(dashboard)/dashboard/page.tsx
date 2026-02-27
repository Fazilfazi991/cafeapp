import { createClient } from '@/lib/supabase-server'

export default async function DashboardHome() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch restaurant and usage data
    const { data: restaurants } = await supabase
        .from('restaurants')
        .select('*, brand_settings(*), connected_accounts(*)')
        .eq('user_id', user.id)
        .limit(1)

    const restaurant = restaurants?.[0]

    if (!restaurant) return null

    // Fetch recent posts
    const { data: recentPosts } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

    // Calculate some placeholder metrics we will use in Phase 4/5
    const connectedPlatformsCount = restaurant.connected_accounts?.filter((a: any) => a.is_active).length || 0

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">Welcome back, {restaurant.name}</h1>
                <p className="text-gray-500">Here is an overview of your social media automation.</p>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="bg-white rounded-xl border p-6 flex flex-col shadow-sm">
                    <span className="text-gray-500 text-sm font-medium mb-1">Posts Created</span>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-extrabold text-[#1A1A1A]">{restaurant.posts_used_this_month}</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border p-6 flex flex-col shadow-sm">
                    <span className="text-gray-500 text-sm font-medium mb-1">Connected Platforms</span>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-extrabold text-[#1A1A1A]">{connectedPlatformsCount}</span>
                        <span className="text-gray-400 mb-1">Active</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-4 font-medium cursor-pointer hover:underline">Manage connections →</p>
                </div>

                <div className="bg-white rounded-xl border p-6 flex flex-col shadow-sm">
                    <span className="text-gray-500 text-sm font-medium mb-1">Current Plan</span>
                    <div className="flex items-end gap-2">
                        <span className={`text-3xl font-bold capitalize ${restaurant.plan === 'expired' ? 'text-red-600' : 'text-green-600'}`}>
                            {restaurant.plan}
                        </span>
                    </div>
                    {restaurant.plan === 'active' && restaurant.plan_end_date && (
                        <p className="text-xs text-gray-500 mt-4 font-medium">Auto-renews on {new Date(restaurant.plan_end_date).toLocaleDateString()}</p>
                    )}
                </div>

            </div>

            {/* Recent Activity / Next Steps */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-4">Recent Activity</h2>

                {recentPosts && recentPosts.length > 0 ? (
                    <div className="space-y-4">
                        {recentPosts.map((post) => (
                            <div key={post.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0 border">
                                    {post.poster_url ? (
                                        <img src={post.poster_url} className="w-full h-full object-cover" alt="Post thumbnail" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No media</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${post.status === 'published' ? 'bg-green-100 text-green-700' :
                                            post.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {post.status}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(post.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-800 line-clamp-2">{post.selected_caption || 'No caption'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-gray-50">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <span className="text-2xl">📸</span>
                        </div>
                        <h3 className="font-semibold text-[#1A1A1A] mb-1">No posts generated yet</h3>
                        <p className="text-sm text-gray-500 mb-4">Get started by uploading a photo or video to let AI do the rest.</p>
                        <a href="/dashboard/create" className="bg-[#1A1A1A] text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors">
                            Create First Post
                        </a>
                    </div>
                )}
            </div>

        </div>
    )
}

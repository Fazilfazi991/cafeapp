'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Calendar as CalendarIcon, Clock, Image as ImageIcon, Trash2, Loader2, Instagram, Facebook, Rocket, Target, CreditCard, Activity, Users, X, Square } from 'lucide-react'
import { Post } from '@/types'
import BoostModal from '@/components/boost/BoostModal'

export default function CalendarPage() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [adAccountConnected, setAdAccountConnected] = useState(false)
    const [adAccountCurrency, setAdAccountCurrency] = useState('AED')
    const [selectedPostForBoost, setSelectedPostForBoost] = useState<Post | null>(null)
    const [selectedPostDetails, setSelectedPostDetails] = useState<Post | null>(null)
    const supabase = createClient()

    useEffect(() => {
        fetchPosts()
    }, [])

    const fetchPosts = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get posts directly. The RLS policy we just added automatically filters securely!
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .order('scheduled_at', { ascending: true })

            if (postsError) throw postsError

            // Fetch connected accounts
            const { data: restaurantsData } = await supabase
                .from('restaurants')
                .select('id')
                .eq('user_id', user.id)
                .limit(1)
            
            if (restaurantsData && restaurantsData[0]) {
                const { data: accounts } = await supabase
                    .from('connected_accounts')
                    .select('ad_account_id, ad_account_currency')
                    .eq('restaurant_id', restaurantsData[0].id)
                    .eq('platform', 'facebook')
                    .maybeSingle()
                
                if (accounts?.ad_account_id) {
                    setAdAccountConnected(true)
                    setAdAccountCurrency(accounts.ad_account_currency || 'AED')
                }
            }

            console.log("CALENDAR PAGE DB FETCH RESULT:", postsData);
            setPosts(postsData || [])
        } catch (err: any) {
            console.error(err)
            setError('Failed to load scheduled posts.')
        } finally {
            setLoading(false)
        }
    }

    const deletePost = async (id: string) => {
        if (!confirm('Are you sure you want to delete this scheduled post?')) return

        try {
            // Note: If integrated with Buffer, we would also need to call Buffer API to delete it there.
            // For MVP, deleting from our database is sufficient tracking.
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', id)

            if (error) throw error
            setPosts(posts.filter(p => p.id !== id))
        } catch (err: any) {
            console.error(err)
            alert('Failed to delete post.')
        }
    }

    const stopBoost = async (id: string) => {
        if (!confirm('Are you sure you want to stop this boost campaign? It will be paused on Meta.')) return

        try {
            setLoading(true)
            const res = await fetch('/api/boost/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: id })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to stop boost')

            setPosts(posts.map(p => p.id === id ? { ...p, boost_status: 'PAUSED' } : p))
        } catch (err: any) {
            console.error(err)
            alert(err.message || 'Failed to stop boost.')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unscheduled'
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Dubai',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(date)
    }

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Content Calendar</h1>
                    <p className="text-gray-500">View and manage your upcoming scheduled posts.</p>
                </div>
                <div className="bg-orange-50 text-[#FF6B35] px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                    <CalendarIcon size={18} />
                    {posts.filter(p => p.status === 'scheduled').length} Scheduled
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 size={32} className="animate-spin mb-4 text-[#FF6B35]" />
                    <p>Loading your content calendar...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <CalendarIcon size={24} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">No posts scheduled</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">You don't have any upcoming content. Head over to Create Post to generate some AI magic!</p>
                    <a href="/dashboard/create" className="inline-flex items-center justify-center px-6 py-3 bg-[#1A1A1A] text-white rounded-md font-bold hover:bg-gray-800 transition-colors">
                        Create New Post
                    </a>
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <div key={post.id} onClick={() => setSelectedPostDetails(post)} className="bg-white border rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow cursor-pointer relative">
                            {/* Media Preview */}
                            <div className="w-full md:w-48 h-48 bg-gray-100 rounded-lg shrink-0 overflow-hidden relative border">
                                {post.poster_url ? (
                                    <img src={post.poster_url} alt="Post media" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                                        <ImageIcon size={32} />
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 flex gap-1">
                                    {post.platforms?.includes('instagram') && (
                                        <div className="w-6 h-6 rounded bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white flex items-center justify-center shadow-sm">
                                            <Instagram size={14} />
                                        </div>
                                    )}
                                    {post.platforms?.includes('facebook') && (
                                        <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center shadow-sm">
                                            <Facebook size={14} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Post Content */}
                            <div className="flex-1 flex flex-col min-w-0">
                                <div className="flex items-start justify-between mb-3 gap-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full w-fit">
                                        <Clock size={14} />
                                        {formatDate(post.scheduled_at)}
                                    </div>
                                    <div className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${post.status === 'published' ? 'bg-green-100 text-green-700' :
                                        post.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                        {post.status}
                                    </div>
                                </div>
                                <p className="text-gray-800 text-sm whitespace-pre-wrap line-clamp-4 flex-1">
                                    {post.selected_caption || <i>No caption provided.</i>}
                                </p>

                                <div className="mt-4 pt-4 border-t flex justify-end gap-3 flex-wrap">
                                    {/* Unboosted Post */}
                                    {post.status === 'published' && post.platforms?.some(p => p === 'facebook' || p === 'instagram') && !post.boost_campaign_id && (
                                        <div className="relative group mr-auto">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); adAccountConnected ? setSelectedPostForBoost(post) : null; }}
                                                className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${adAccountConnected ? 'bg-orange-100 text-[#FF6B35] hover:bg-orange-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                            >
                                                <span>⚡</span> Boost Post
                                            </button>
                                            {!adAccountConnected && (
                                                <div className="absolute bottom-full mb-2 left-0 hidden group-hover:block w-48 bg-gray-900 text-white text-xs p-2 rounded text-center z-10 shadow-lg">
                                                    Connect your Ad Account in Settings to boost posts
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Boosted Post Component */}
                                    {post.boost_campaign_id && (
                                        <div className="flex flex-col gap-2 mr-auto w-full md:w-auto mt-2 md:mt-0 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            {/* Badge */}
                                            {post.boost_status === 'ACTIVE' && (
                                                <div className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded w-fit flex items-center gap-1.5 uppercase tracking-wide">
                                                    <span>⚡</span> Boosted (ACTIVE)
                                                </div>
                                            )}
                                            {post.boost_status === 'PAUSED' && (
                                                <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded w-fit flex items-center gap-1.5 uppercase tracking-wide">
                                                    <span>⚡</span> Boosted (PAUSED)
                                                </div>
                                            )}
                                            {post.boost_status === 'COMPLETED' && (
                                                <div className="bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1 rounded w-fit flex items-center gap-1.5 uppercase tracking-wide">
                                                    <span>⚡</span> Boosted (COMPLETED)
                                                </div>
                                            )}

                                            {/* Stats */}
                                            {(!post.boost_reach && (!post.boost_spend || post.boost_spend === 0)) ? (
                                                <p className="text-xs text-gray-500 italic">Stats updating soon...</p>
                                            ) : (
                                                <div className="flex flex-col gap-1 text-xs text-gray-600 mt-1">
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                                        <span className="flex items-center gap-1.5"><Users size={14} className="text-blue-500" /> Reach: <b>{post.boost_reach}</b> people</span>
                                                        <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-[#FF6B35]" /> Spent: <b>{post.boost_spend}</b> of {post.boost_budget} {adAccountCurrency}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-2 mt-1">
                                                {post.boost_status === 'ACTIVE' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); stopBoost(post.id); }}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-bold rounded flex items-center gap-1.5"
                                                    >
                                                        <div className="w-2 h-2 rounded-sm bg-red-600"></div> Stop Boost
                                                    </button>
                                                )}
                                                {(post.boost_status === 'COMPLETED' || post.boost_status === 'PAUSED') && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); adAccountConnected ? setSelectedPostForBoost(post) : null; }}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${adAccountConnected ? 'bg-orange-100 text-[#FF6B35] hover:bg-orange-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                    >
                                                        <span>⚡</span> Boost Again
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ml-auto gap-2 self-start md:self-end mt-auto"
                                    >
                                        <Trash2 size={16} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedPostForBoost && (
                <BoostModal 
                    post={selectedPostForBoost}
                    isOpen={!!selectedPostForBoost}
                    onClose={() => setSelectedPostForBoost(null)}
                    onSuccess={() => {
                        fetchPosts()
                    }}
                    adAccountCurrency={adAccountCurrency}
                />
            )}

            {selectedPostDetails && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedPostDetails(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <CalendarIcon size={20} className="text-gray-500" /> Post Details
                            </h2>
                            <button onClick={() => setSelectedPostDetails(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
                            {/* Left: Image */}
                            <div className="w-full md:w-1/2 aspect-square bg-gray-100 rounded-xl overflow-hidden border self-start">
                                {selectedPostDetails.poster_url ? (
                                    <img src={selectedPostDetails.poster_url} alt="Post image" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                            </div>
                            {/* Right: Info */}
                            <div className="w-full md:w-1/2 flex flex-col">
                                <span className={`w-fit text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded mb-4 ${selectedPostDetails.status === 'published' ? 'bg-green-100 text-green-700' :
                                    selectedPostDetails.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {selectedPostDetails.status}
                                </span>
                                
                                <p className="text-xs text-gray-500 mb-2 flex items-center gap-2"><Clock size={14}/> Scheduled for {formatDate(selectedPostDetails.scheduled_at)}</p>
                                <div className="text-sm text-gray-800 whitespace-pre-wrap mb-8 border bg-gray-50 p-4 rounded-lg">
                                    {selectedPostDetails.selected_caption || <i className="text-gray-400">No caption provided.</i>}
                                </div>

                                {selectedPostDetails.boost_campaign_id && (
                                    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-gray-50 px-5 py-3.5 border-b flex items-center justify-between">
                                            <h3 className="font-bold text-sm flex items-center gap-2"><Rocket size={16} className="text-[#FF6B35]"/> Boost Summary</h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${selectedPostDetails.boost_status === 'ACTIVE' ? 'bg-green-100 text-green-800' : selectedPostDetails.boost_status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}>
                                                {selectedPostDetails.boost_status}
                                            </span>
                                        </div>
                                        <div className="p-5 space-y-4 text-sm">
                                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                                <span className="flex items-center gap-2 text-gray-600"><CreditCard size={16}/> Total Budget</span>
                                                <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{selectedPostDetails.boost_budget} {adAccountCurrency}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                                <span className="flex items-center gap-2 text-gray-600"><Clock size={16}/> Duration</span>
                                                <span className="font-medium text-gray-900">{selectedPostDetails.boost_duration_days} days</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                                <span className="flex items-center gap-2 text-gray-600"><Users size={16}/> Reach</span>
                                                <span className="font-medium text-gray-900">{selectedPostDetails.boost_reach || 0} people</span>
                                            </div>
                                            <div className="flex justify-between items-center pb-1">
                                                <span className="flex items-center gap-2 text-gray-600"><Target size={16}/> Total Spent</span>
                                                <span className="font-bold text-[#FF6B35]">{selectedPostDetails.boost_spend || 0} {adAccountCurrency}</span>
                                            </div>
                                        </div>
                                        {selectedPostDetails.boost_status === 'ACTIVE' && (
                                            <div className="p-4 bg-gray-50 border-t flex flex-col gap-2">
                                                <button 
                                                    onClick={() => { 
                                                        stopBoost(selectedPostDetails.id); 
                                                        setSelectedPostDetails(prev => prev ? { ...prev, boost_status: 'PAUSED' } : null); 
                                                    }}
                                                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-bold rounded-lg flex items-center justify-center gap-2 w-full border border-red-100"
                                                >
                                                    <div className="w-2.5 h-2.5 rounded-sm bg-red-600"></div> Stop Boost
                                                </button>
                                                <p className="text-center text-[10px] text-gray-500">Your remaining budget will not be charged.</p>
                                            </div>
                                        )}
                                        {(selectedPostDetails.boost_status === 'PAUSED' || selectedPostDetails.boost_status === 'COMPLETED') && (
                                            <div className="p-4 bg-gray-50 border-t">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedPostDetails(null);
                                                        adAccountConnected ? setSelectedPostForBoost(selectedPostDetails) : null;
                                                    }}
                                                    className={`px-4 py-2 transition-colors text-sm font-bold rounded-lg flex items-center justify-center gap-2 w-full ${adAccountConnected ? 'bg-[#FF6B35] text-white hover:bg-[#e85a25]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                                                >
                                                    <span>⚡</span> Boost Again
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

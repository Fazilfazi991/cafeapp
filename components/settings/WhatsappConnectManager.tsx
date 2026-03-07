'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'

// Declare the global fbq / FB objects for TypeScript
declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

export default function WhatsappConnectManager({ restaurantId, initialConnected }: { restaurantId: string, initialConnected: boolean }) {
    const [isConnected, setIsConnected] = useState(initialConnected);
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
    const [templateStatus, setTemplateStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fbSdkLoaded, setFbSdkLoaded] = useState(false);

    // Initial status fetch + configure polling if connected
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/whatsapp/status?restaurantId=${restaurantId}`);
                const data = await res.json();

                if (data.connected) {
                    setIsConnected(true);
                    setPhoneNumber(data.phoneNumber);
                    setTemplateStatus(data.templateStatus);
                } else {
                    setIsConnected(false);
                }
            } catch (err) {
                console.error("Failed to fetch WhatsApp status", err);
            }
        };

        fetchStatus();

        // If connected, poll every 30 mins to check if template got approved
        let interval: NodeJS.Timeout;
        if (isConnected) {
            interval = setInterval(fetchStatus, 30 * 60 * 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [restaurantId, isConnected]);

    // Load Meta SDK
    useEffect(() => {
        const checkSdk = () => {
            if (window.FB) {
                setFbSdkLoaded(true)
            }
        }

        // Check immediately
        checkSdk()

        // Or wait for it to load
        window.fbAsyncInit = function () {
            window.FB.init({
                appId: process.env.NEXT_PUBLIC_META_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v19.0'
            });
            setFbSdkLoaded(true)
        };

        // Inject script if not already there
        if (!document.getElementById('facebook-jssdk')) {
            const js = document.createElement('script');
            js.id = 'facebook-jssdk';
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            document.head.appendChild(js);
        }
    }, [])

    const launchEmbeddedSignup = () => {
        if (!window.FB) {
            setError("Meta SDK failed to load. Please disable ad-blockers and try again.");
            return;
        }

        setIsLoading(true);
        setError(null);

        window.FB.login((response: any) => {
            if (response.authResponse) {
                const accessToken = response.authResponse.accessToken;
                const code = response.authResponse.code;

                // Embedded signup typically returns waba_id and phone_number_id after the flow is completed
                // We mock this slightly for the standard login flow, in production the specific WhatsApp scope returns these.
                const whatsappBusinessAccountId = "placeholder_waba_from_sdk";
                const whatsappPhoneNumberId = "placeholder_phone_id_from_sdk";

                // Send to our backend
                fetch('/api/whatsapp/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        restaurantId,
                        code,
                        metaAccessToken: accessToken,
                        whatsappBusinessAccountId,
                        whatsappPhoneNumberId
                    })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            setIsConnected(true);
                            setPhoneNumber(data.phoneNumber);
                            // Refetch fully to get template status
                            window.location.reload();
                        } else {
                            setError(data.error || "Failed to connect WhatsApp");
                            setIsLoading(false);
                        }
                    })
                    .catch(err => {
                        setError(err.message || "An unexpected error occurred");
                        setIsLoading(false);
                    });

            } else {
                setError("User cancelled login or did not fully authorize.");
                setIsLoading(false);
            }
        }, {
            scope: 'whatsapp_business_management,whatsapp_business_messaging',
            return_scopes: true,
            extras: {
                feature: 'whatsapp_embedded_signup',
                setup: {}
            }
        });
    }

    const handleDisconnect = async () => {
        setIsLoading(true);
        try {
            await fetch('/api/whatsapp/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId })
            });
            setIsConnected(false);
            setPhoneNumber(null);
            setTemplateStatus(null);
        } catch (err) {
            console.error(err);
        }
        setIsLoading(false);
    }

    if (isConnected) {
        return (
            <div className="border rounded-lg p-5 bg-gray-50 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-[#1A1A1A] text-sm">WhatsApp Business</span>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Connected
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">Sending from: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{phoneNumber || 'Loading...'}</span></p>
                    </div>
                    <button
                        onClick={handleDisconnect}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
                    >
                        Disconnect
                    </button>
                </div>

                {/* Template Status Warning */}
                {templateStatus === 'PENDING' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-3 text-sm text-yellow-800">
                        <AlertTriangle className="shrink-0 text-yellow-600 mt-0.5" size={16} />
                        <div>
                            <p className="font-medium mb-1">Message Template Pending Approval</p>
                            <p className="text-yellow-700 opacity-90">Meta is reviewing your required "daily_special" template. This usually takes between 1-24 hours. Broadcasting is paused until approved.</p>
                        </div>
                    </div>
                )}
                {templateStatus === 'REJECTED' && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 flex gap-3 text-sm text-red-800">
                        <AlertTriangle className="shrink-0 text-red-600 mt-0.5" size={16} />
                        <div>
                            <p className="font-medium mb-1">Template Rejected</p>
                            <p className="text-red-700 opacity-90">Meta rejected the automated template. Please contact support.</p>
                        </div>
                    </div>
                )}
                {templateStatus === 'APPROVED' && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-2 flex items-center gap-2 text-sm text-green-800">
                        <CheckCircle2 size={16} className="text-green-600" />
                        Template approved! You are ready to broadcast.
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="border rounded-lg p-5">
            <p className="text-sm text-gray-600 mb-4">
                Connect your WhatsApp Business account to broadcast daily specials directly to your customers' phones.
            </p>

            {error && (
                <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
                    {error}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <button
                    onClick={launchEmbeddedSignup}
                    disabled={isLoading}
                    className="bg-[#25D366] text-white border-transparent border rounded-md px-4 py-2 text-sm font-medium hover:bg-[#128C7E] transition-colors w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-60"
                >
                    {isLoading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Connecting...
                        </>
                    ) : (
                        '📱 Connect WhatsApp Business'
                    )}
                </button>

                {!fbSdkLoaded && !isLoading && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> Loading Meta SDK...
                    </span>
                )}
            </div>

            <p className="text-xs text-gray-400 mt-3">
                A Meta login flow will open. Sign in with the Facebook account that manages your WhatsApp Business number.
            </p>
        </div>
    )
}

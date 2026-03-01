import React from 'react';

export interface PosterTemplateParams {
    photoUrl: string;
    businessName: string;
    tagline?: string;
    customText?: string;
    phone?: string;
    website?: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    fontStyle: string;
}

// ─── TEMPLATE 1: MINIMAL CLEAN ─────────────────────────────────────────────
// Full-bleed food photo, dark gradient overlay, text bottom-left, colored contact strip
export function buildMinimalCleanSatori({
    photoUrl, businessName, customText, phone, website, logoUrl, primaryColor
}: PosterTemplateParams): React.ReactNode {
    return (
        <div style={{ width: 1080, height: 1080, position: 'relative', display: 'flex', fontFamily: 'Inter' }}>
            {/* Background photo */}
            <img src={photoUrl} style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1080, objectFit: 'cover' }} />

            {/* Dark gradient overlay */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 450,
                background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.88))',
                display: 'flex',
            }} />

            {/* Logo top-right */}
            {logoUrl ? (
                <div style={{
                    position: 'absolute', top: 32, right: 32,
                    width: 88, height: 88,
                    background: 'white', borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 12,
                    boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
                }}>
                    <img src={logoUrl} style={{ width: 64, height: 64, objectFit: 'contain' }} />
                </div>
            ) : null}

            {/* Accent line */}
            <div style={{
                position: 'absolute', bottom: 145, left: 40,
                width: 56, height: 5,
                background: primaryColor, borderRadius: 3,
                display: 'flex',
            }} />

            {/* Custom offer text */}
            {customText ? (
                <div style={{
                    position: 'absolute', bottom: 168, left: 40, right: 120,
                    color: primaryColor, fontSize: 38, fontWeight: 900,
                    lineHeight: 1.2,
                    display: 'flex',
                }}>
                    {customText}
                </div>
            ) : null}

            {/* Business name */}
            <div style={{
                position: 'absolute', bottom: 62, left: 40, right: 40,
                color: 'white', fontSize: 40, fontWeight: 700,
                letterSpacing: -0.5,
                display: 'flex',
            }}>
                {businessName}
            </div>

            {/* Contact strip */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 52, background: primaryColor,
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: 40, paddingRight: 40,
            }}>
                <span style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>{phone || ''}</span>
                <span style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>{website || ''}</span>
            </div>
        </div>
    );
}

// ─── TEMPLATE 2: BOLD IMPACT ────────────────────────────────────────────────
// Photo top 58%, solid brand color block bottom 42% with text
export function buildBoldImpactSatori({
    photoUrl, businessName, customText, phone, website, logoUrl, primaryColor
}: PosterTemplateParams): React.ReactNode {
    return (
        <div style={{ width: 1080, height: 1080, position: 'relative', display: 'flex', fontFamily: 'Inter', background: primaryColor }}>
            {/* Photo section top 580px */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 580, display: 'flex', overflow: 'hidden' }}>
                <img src={photoUrl} style={{ width: 1080, height: 580, objectFit: 'cover' }} />
                {/* Gradient blending photo into color block */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 100,
                    background: `linear-gradient(to bottom, transparent, ${primaryColor})`,
                    display: 'flex',
                }} />
            </div>

            {/* Logo top-left */}
            {logoUrl ? (
                <div style={{
                    position: 'absolute', top: 24, left: 24,
                    width: 72, height: 72,
                    background: 'white', borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 10,
                }}>
                    <img src={logoUrl} style={{ width: 52, height: 52, objectFit: 'contain' }} />
                </div>
            ) : null}

            {/* Bottom color block */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 500,
                background: primaryColor,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                paddingLeft: 40, paddingRight: 40, paddingTop: 30,
            }}>
                {/* Custom offer text */}
                {customText ? (
                    <div style={{ color: 'white', fontSize: 46, fontWeight: 900, lineHeight: 1.1, marginBottom: 14, display: 'flex' }}>
                        {customText}
                    </div>
                ) : null}

                {/* Business name */}
                <div style={{
                    color: 'rgba(255,255,255,0.85)', fontSize: 26, fontWeight: 700,
                    letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 18,
                    display: 'flex',
                }}>
                    {businessName}
                </div>

                {/* Divider */}
                <div style={{ width: 72, height: 3, background: 'rgba(255,255,255,0.35)', borderRadius: 2, marginBottom: 18, display: 'flex' }} />

                {/* Contacts */}
                <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
                    {phone ? <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 19, fontWeight: 500 }}>📞 {phone}</span> : null}
                    {website ? <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 19, fontWeight: 500 }}>🌐 {website}</span> : null}
                </div>
            </div>
        </div>
    );
}

// ─── TEMPLATE 3: LIFESTYLE FRAME ────────────────────────────────────────────
// Light cream background, centered photo in rounded card, brand name above, contacts below
export function buildLifestyleFrameSatori({
    photoUrl, businessName, customText, phone, website, logoUrl, primaryColor
}: PosterTemplateParams): React.ReactNode {
    return (
        <div style={{
            width: 1080, height: 1080,
            position: 'relative',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#F7F7F7', fontFamily: 'Inter',
            paddingTop: 60, paddingBottom: 40,
            paddingLeft: 40, paddingRight: 40,
        }}>
            {/* Top accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: primaryColor, display: 'flex' }} />

            {/* Logo top-right */}
            {logoUrl ? (
                <div style={{
                    position: 'absolute', top: 20, right: 24,
                    width: 62, height: 62,
                    borderRadius: 10,
                    border: '2px solid #E0E0E0',
                    background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 8,
                }}>
                    <img src={logoUrl} style={{ width: 46, height: 46, objectFit: 'contain' }} />
                </div>
            ) : null}

            {/* Business name */}
            <div style={{
                color: primaryColor, fontSize: 26, fontWeight: 700,
                letterSpacing: 3, textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 20,
                display: 'flex',
            }}>
                {businessName}
            </div>

            {/* Photo card */}
            <div style={{
                width: 960, height: 650,
                borderRadius: 18, overflow: 'hidden',
                display: 'flex',
            }}>
                <img src={photoUrl} style={{ width: 960, height: 650, objectFit: 'cover' }} />
            </div>

            {/* Custom text */}
            {customText ? (
                <div style={{
                    color: '#1A1A1A', fontSize: 30, fontWeight: 900,
                    textAlign: 'center', marginTop: 20, lineHeight: 1.2,
                    display: 'flex',
                }}>
                    {customText}
                </div>
            ) : null}

            {/* Contacts */}
            <div style={{ display: 'flex', gap: 36, marginTop: customText ? 14 : 20, alignItems: 'center' }}>
                {phone ? <span style={{ color: '#555', fontSize: 17, fontWeight: 500 }}>{phone}</span> : null}
                {website ? <span style={{ color: '#555', fontSize: 17, fontWeight: 500 }}>{website}</span> : null}
            </div>

            {/* Bottom accent bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: primaryColor, display: 'flex' }} />
        </div>
    );
}

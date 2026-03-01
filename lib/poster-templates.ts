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

// Wraps an HTML body string in a complete document with Google Fonts
function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      font-family: 'Inter', Arial, sans-serif;
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── TEMPLATE 1: MINIMAL CLEAN ─────────────────────────────────────────────
export function buildMinimalCleanTemplate({
  photoUrl, businessName, customText, phone, website, logoUrl, primaryColor
}: PosterTemplateParams): string {
  const body = `
<div style="
  width:1080px; height:1080px;
  position:relative; overflow:hidden;
">
  <!-- Background photo fills canvas exactly -->
  <img src="${photoUrl}" style="
    width:1080px; height:1080px;
    object-fit:cover;
    position:absolute; top:0; left:0;
    display:block;
  "/>

  <!-- Dark gradient – bottom 40% -->
  <div style="
    position:absolute; bottom:0; left:0; right:0; height:440px;
    background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.9) 100%);
  "></div>

  <!-- Logo: top-right white pill -->
  ${logoUrl ? `
  <div style="
    position:absolute; top:32px; right:32px;
    width:88px; height:88px;
    background:white; border-radius:14px;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 6px 24px rgba(0,0,0,0.35);
    padding:12px;
  ">
    <img src="${logoUrl}" style="width:100%; height:100%; object-fit:contain;"/>
  </div>` : ''}

  <!-- Accent bar -->
  <div style="
    position:absolute; bottom:140px; left:40px;
    width:56px; height:5px;
    background:${primaryColor}; border-radius:3px;
  "></div>

  <!-- Custom offer text -->
  ${customText ? `
  <div style="
    position:absolute; bottom:168px; left:40px; right:120px;
    color:${primaryColor}; font-size:38px; font-weight:800;
    line-height:1.2; text-shadow:0 2px 12px rgba(0,0,0,0.6);
  ">${customText}</div>` : ''}

  <!-- Business name -->
  <div style="
    position:absolute; bottom:60px; left:40px; right:40px;
    color:white; font-size:40px; font-weight:700;
    letter-spacing:-0.5px;
    text-shadow:0 2px 12px rgba(0,0,0,0.6);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  ">${businessName}</div>

  <!-- Contact strip – fixed 50px at bottom -->
  <div style="
    position:absolute; bottom:0; left:0; right:0;
    height:52px;
    background:${primaryColor};
    display:flex; align-items:center;
    justify-content:space-between;
    padding:0 40px;
  ">
    <span style="color:white; font-size:17px; font-weight:600;">${phone || ''}</span>
    <span style="color:white; font-size:17px; font-weight:600;">${website || ''}</span>
  </div>
</div>`;
  return wrapHtml(body);
}

// ─── TEMPLATE 2: BOLD IMPACT ────────────────────────────────────────────────
export function buildBoldImpactTemplate({
  photoUrl, businessName, customText, phone, website, logoUrl, primaryColor
}: PosterTemplateParams): string {
  // Photo: top 580px. Color block: bottom 500px (some overlap with gradient on photo)
  const body = `
<div style="
  width:1080px; height:1080px;
  position:relative; overflow:hidden;
  background:${primaryColor};
">
  <!-- Photo section: top 580px -->
  <div style="
    position:absolute; top:0; left:0; right:0;
    height:580px; overflow:hidden;
  ">
    <img src="${photoUrl}" style="
      width:1080px; height:580px;
      object-fit:cover; display:block;
    "/>
    <!-- Gradient into primary at bottom of photo -->
    <div style="
      position:absolute; bottom:0; left:0; right:0; height:100px;
      background:linear-gradient(to bottom, transparent, ${primaryColor});
    "></div>
  </div>

  <!-- Logo: top-left -->
  ${logoUrl ? `
  <div style="
    position:absolute; top:24px; left:24px;
    width:72px; height:72px;
    background:white; border-radius:10px;
    padding:10px;
    box-shadow:0 4px 16px rgba(0,0,0,0.25);
    display:flex; align-items:center; justify-content:center;
  ">
    <img src="${logoUrl}" style="width:100%; height:100%; object-fit:contain;"/>
  </div>` : ''}

  <!-- Color block text content -->
  <div style="
    position:absolute; bottom:0; left:0; right:0;
    height:500px;
    background:${primaryColor};
    padding:32px 40px 0 40px;
    display:flex; flex-direction:column; justify-content:center;
  ">
    ${customText ? `
    <div style="
      color:white; font-size:46px; font-weight:900;
      line-height:1.1; margin-bottom:14px;
    ">${customText}</div>` : ''}

    <div style="
      color:rgba(255,255,255,0.85); font-size:26px; font-weight:600;
      letter-spacing:2.5px; text-transform:uppercase;
      margin-bottom:18px;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    ">${businessName}</div>

    <div style="
      width:72px; height:3px;
      background:rgba(255,255,255,0.35); border-radius:2px;
      margin-bottom:18px;
    "></div>

    <div style="display:flex; gap:28px; align-items:center;">
      ${phone ? `<span style="color:rgba(255,255,255,0.85); font-size:19px; font-weight:500;">📞 ${phone}</span>` : ''}
      ${website ? `<span style="color:rgba(255,255,255,0.85); font-size:19px; font-weight:500;">🌐 ${website}</span>` : ''}
    </div>
  </div>
</div>`;
  return wrapHtml(body);
}

// ─── TEMPLATE 3: LIFESTYLE FRAME ────────────────────────────────────────────
export function buildLifestyleFrameTemplate({
  photoUrl, businessName, customText, phone, website, logoUrl, primaryColor
}: PosterTemplateParams): string {
  // Strict height budget for 1080px canvas:
  //   top bar: 10px
  //   business name row: ~50px + 20px gap
  //   photo frame: 700px + 20px gap
  //   custom text (if any): ~50px + 12px gap
  //   contacts: ~30px
  //   bottom bar: 10px
  //   padding top+bottom: 20px
  //   total ≈ 922px → safely fits inside 1080px
  const body = `
<div style="
  width:1080px; height:1080px;
  position:relative; overflow:hidden;
  background:#F7F7F7;
  display:flex; flex-direction:column;
  align-items:center;
  padding:60px 40px 40px;
">
  <!-- Top accent bar -->
  <div style="
    position:absolute; top:0; left:0; right:0;
    height:10px; background:${primaryColor};
  "></div>

  <!-- Logo: top-right -->
  ${logoUrl ? `
  <div style="
    position:absolute; top:20px; right:24px;
    width:62px; height:62px;
    border-radius:10px; overflow:hidden;
    border:2px solid #E0E0E0;
    background:white;
    display:flex; align-items:center; justify-content:center;
    padding:8px;
  ">
    <img src="${logoUrl}" style="width:100%; height:100%; object-fit:contain;"/>
  </div>` : ''}

  <!-- Business name -->
  <div style="
    color:${primaryColor}; font-size:26px; font-weight:700;
    letter-spacing:3px; text-transform:uppercase;
    text-align:center; margin-bottom:20px;
    max-width:900px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  ">${businessName}</div>

  <!-- Photo: fitted tightly -->
  <div style="
    width:960px; height:650px;
    border-radius:18px; overflow:hidden;
    box-shadow:0 16px 48px rgba(0,0,0,0.18);
    flex-shrink:0;
  ">
    <img src="${photoUrl}" style="
      width:960px; height:650px;
      object-fit:cover; display:block;
    "/>
  </div>

  <!-- Custom text -->
  ${customText ? `
  <div style="
    color:#1A1A1A; font-size:30px; font-weight:800;
    text-align:center; margin-top:20px; line-height:1.2;
    max-width:900px;
  ">${customText}</div>` : ''}

  <!-- Contact row -->
  <div style="
    display:flex; gap:36px; margin-top:${customText ? '14px' : '20px'};
    color:#555; font-size:17px; font-weight:500;
  ">
    ${phone ? `<span>${phone}</span>` : ''}
    ${website ? `<span>${website}</span>` : ''}
  </div>

  <!-- Bottom accent bar -->
  <div style="
    position:absolute; bottom:0; left:0; right:0;
    height:10px; background:${primaryColor};
  "></div>
</div>`;
  return wrapHtml(body);
}

export function renderTemplate(style: 'minimal' | 'bold' | 'lifestyle', params: PosterTemplateParams): string {
  if (style === 'minimal') return buildMinimalCleanTemplate(params);
  if (style === 'bold') return buildBoldImpactTemplate(params);
  return buildLifestyleFrameTemplate(params);
}

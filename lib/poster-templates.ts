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

export function buildMinimalCleanTemplate({
    photoUrl,
    businessName,
    customText,
    phone,
    website,
    logoUrl,
    primaryColor
}: PosterTemplateParams): string {
    return `
    <div style="
      width:1080px; height:1080px; 
      position:relative; overflow:hidden;
      font-family: 'Inter', sans-serif;
    ">
      <!-- Background photo -->
      <img src="${photoUrl}" style="
        width:100%; height:100%; 
        object-fit:cover; position:absolute;
      "/>
      
      <!-- Dark gradient overlay -->
      <div style="
        position:absolute; bottom:0; left:0; 
        right:0; height:45%;
        background: linear-gradient(
          transparent, rgba(0,0,0,0.85)
        );
      "></div>
      
      <!-- Logo top right -->
      ${logoUrl ? `<div style="
        position:absolute; top:30px; right:30px;
        width:80px; height:80px;
        background:white; border-radius:12px;
        display:flex; align-items:center; 
        justify-content:center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        padding:10px; box-sizing:border-box;
      ">
        <img src="${logoUrl}" style="
          width:100%; height:100%; 
          object-fit:contain;
        "/>
      </div>` : ''}
      
      <!-- Accent line -->
      <div style="
        position:absolute; bottom:130px; left:40px;
        width:60px; height:4px;
        background:${primaryColor};
        border-radius:2px;
      "></div>
      
      <!-- Custom text / offer -->
      ${customText ? `<div style="
        position:absolute; bottom:160px; left:40px;
        right:40px;
        color:${primaryColor}; 
        font-size:36px; font-weight:800;
        text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        line-height:1.2;
      ">${customText}</div>` : ''}
      
      <!-- Business name -->
      <div style="
        position:absolute; bottom:60px; left:40px;
        color:white; font-size:42px; 
        font-weight:700; letter-spacing:-1px;
        text-shadow: 0 2px 10px rgba(0,0,0,0.5);
      ">${businessName}</div>
      
      <!-- Contact strip -->
      <div style="
        position:absolute; bottom:0; left:0; right:0;
        height:50px;
        background:${primaryColor};
        display:flex; align-items:center;
        justify-content:space-between;
        padding:0 40px; box-sizing:border-box;
      ">
        <span style="
          color:white; font-size:18px; 
          font-weight:600; opacity:0.95;
        ">${phone || ''}</span>
        <span style="
          color:white; font-size:18px;
          font-weight:600; opacity:0.95;
        ">${website || ''}</span>
      </div>
    </div>`;
}

export function buildBoldImpactTemplate({
    photoUrl,
    businessName,
    customText,
    phone,
    website,
    logoUrl,
    primaryColor
}: PosterTemplateParams): string {
    return `
    <div style="
      width:1080px; height:1080px;
      position:relative; overflow:hidden;
      font-family: 'Inter', sans-serif;
      background:${primaryColor};
    ">
      <!-- Food photo top section -->
      <div style="
        position:absolute; top:0; left:0; right:0;
        height:620px; overflow:hidden;
      ">
        <img src="${photoUrl}" style="
          width:100%; height:100%; 
          object-fit:cover;
        "/>
        <!-- Subtle overlay at bottom of photo -->
        <div style="
          position:absolute; bottom:0; left:0; 
          right:0; height:80px;
          background:linear-gradient(
            transparent, ${primaryColor}
          );
        "></div>
      </div>
      
      <!-- Logo top left -->
      ${logoUrl ? `<div style="
        position:absolute; top:25px; left:25px;
        background:white; border-radius:10px;
        padding:10px; width:70px; height:70px;
        box-sizing:border-box;
        box-shadow:0 4px 15px rgba(0,0,0,0.2);
      ">
        <img src="${logoUrl}" style="
          width:100%; height:100%; 
          object-fit:contain;
        "/>
      </div>` : ''}
      
      <!-- Bottom color section -->
      <div style="
        position:absolute; bottom:0; left:0; right:0;
        height:460px;
        background:${primaryColor};
        padding:30px 40px;
        box-sizing:border-box;
        display:flex; flex-direction:column;
        justify-content:center;
      ">
        <!-- Offer/custom text -->
        ${customText ? `<div style="
          color:white; font-size:44px; 
          font-weight:900; line-height:1.1;
          margin-bottom:12px;
          opacity:0.95;
        ">${customText}</div>` : ''}
        
        <!-- Business name -->
        <div style="
          color:rgba(255,255,255,0.85); 
          font-size:28px; font-weight:600;
          letter-spacing:2px;
          text-transform:uppercase;
          margin-bottom:20px;
        ">${businessName}</div>
        
        <!-- Divider line -->
        <div style="
          width:80px; height:3px;
          background:rgba(255,255,255,0.4);
          border-radius:2px; margin-bottom:20px;
        "></div>
        
        <!-- Contact info -->
        <div style="
          display:flex; gap:30px;
          color:rgba(255,255,255,0.85);
          font-size:20px; font-weight:500;
        ">
          ${phone ? `<span>📞 ${phone}</span>` : ''}
          ${website ? `<span>🌐 ${website}</span>` : ''}
        </div>
      </div>
    </div>`;
}

export function buildLifestyleFrameTemplate({
    photoUrl,
    businessName,
    customText,
    phone,
    website,
    logoUrl,
    primaryColor
}: PosterTemplateParams): string {
    return `
    <div style="
      width:1080px; height:1080px;
      position:relative; overflow:hidden;
      font-family: 'Inter', sans-serif;
      background:#FAFAFA;
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      padding:50px; box-sizing:border-box;
    ">
      <!-- Top accent bar -->
      <div style="
        position:absolute; top:0; left:0; right:0;
        height:8px; background:${primaryColor};
      "></div>
      
      <!-- Logo top right -->
      ${logoUrl ? `<div style="
        position:absolute; top:25px; right:25px;
        width:65px; height:65px;
        border-radius:10px; overflow:hidden;
        border:2px solid #EEEEEE;
        background:white;
      ">
        <img src="${logoUrl}" style="
          width:100%; height:100%; 
          object-fit:contain; padding:8px;
          box-sizing:border-box;
        "/>
      </div>` : ''}
      
      <!-- Business name top -->
      <div style="
        color:${primaryColor}; 
        font-size:28px; font-weight:700;
        letter-spacing:3px;
        text-transform:uppercase;
        margin-bottom:30px;
        text-align:center;
      ">${businessName}</div>
      
      <!-- Food photo centered -->
      <div style="
        width:860px; height:620px;
        border-radius:20px; overflow:hidden;
        box-shadow:0 20px 60px rgba(0,0,0,0.15);
        margin-bottom:30px;
      ">
        <img src="${photoUrl}" style="
          width:100%; height:100%; 
          object-fit:cover;
        "/>
      </div>
      
      <!-- Custom text -->
      ${customText ? `<div style="
        color:#1A1A1A; font-size:34px; 
        font-weight:800; text-align:center;
        margin-bottom:15px; line-height:1.2;
      ">${customText}</div>` : ''}
      
      <!-- Contact row -->
      <div style="
        display:flex; gap:40px;
        color:#666666; font-size:18px;
      ">
        ${phone ? `<span>${phone}</span>` : ''}
        ${website ? `<span>${website}</span>` : ''}
      </div>
      
      <!-- Bottom accent bar -->
      <div style="
        position:absolute; bottom:0; 
        left:0; right:0;
        height:8px; background:${primaryColor};
      "></div>
    </div>`;
}

export function renderTemplate(style: 'minimal' | 'bold' | 'lifestyle', params: PosterTemplateParams): string {
    if (style === 'minimal') return buildMinimalCleanTemplate(params);
    if (style === 'bold') return buildBoldImpactTemplate(params);
    return buildLifestyleFrameTemplate(params);
}

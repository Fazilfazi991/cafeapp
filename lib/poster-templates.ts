export interface PosterTemplateData {
    photoBase64: string;
    logoBase64: string | null;
    businessName: string;
    customText: string;
    phone: string;
    website: string;
    primaryColor: string;
    secondaryColor: string;
}

const baseStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', sans-serif;
        width: 1080px;
        height: 1080px;
        box-sizing: border-box;
    }
    .poster-container {
        width: 1080px;
        height: 1080px;
        position: relative;
        overflow: hidden;
    }
`;

export function getMinimalTemplate(data: PosterTemplateData): string {
    const { photoBase64, logoBase64, businessName, customText, phone, website, primaryColor } = data;
    const hasContact = phone || website;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            ${baseStyles}
            .bg-image {
                position: absolute;
                top: 0;
                left: 0;
                width: 1080px;
                height: 1080px;
                object-fit: cover;
                z-index: 1;
            }
            .gradient-overlay {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 500px;
                background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.9));
                z-index: 2;
            }
            .logo-box {
                position: absolute;
                top: 40px;
                right: 40px;
                width: 120px;
                height: 120px;
                background: white;
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .logo-box img {
                max-width: 90px;
                max-height: 90px;
                object-fit: contain;
            }
            .content {
                position: absolute;
                bottom: ${hasContact ? '70px' : '40px'};
                left: 50px;
                right: 50px;
                z-index: 10;
            }
            .accent-line {
                width: 80px;
                height: 8px;
                background-color: ${primaryColor};
                border-radius: 4px;
                margin-bottom: 20px;
            }
            .custom-text {
                color: ${primaryColor};
                font-size: 54px;
                font-weight: 900;
                line-height: 1.1;
                margin-bottom: 15px;
                text-transform: uppercase;
                text-shadow: 0 4px 15px rgba(0,0,0,0.5);
            }
            .business-name {
                color: white;
                font-size: 48px;
                font-weight: 700;
                letter-spacing: -0.5px;
                text-shadow: 0 4px 15px rgba(0,0,0,0.5);
            }
            .contact-strip {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background-color: ${primaryColor};
                height: ${hasContact ? '60px' : '30px'};
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 50px;
            }
            .contact-item {
                color: white;
                font-size: 22px;
                font-weight: 700;
            }
        </style>
    </head>
    <body>
        <div class="poster-container">
            <img class="bg-image" src="data:image/jpeg;base64,${photoBase64}" />
            <div class="gradient-overlay"></div>
            
            ${logoBase64 ? `
            <div class="logo-box">
                <img src="data:image/png;base64,${logoBase64}" />
            </div>
            ` : ''}

            <div class="content">
                <div class="accent-line"></div>
                ${customText ? `<div class="custom-text">${customText}</div>` : ''}
                <div class="business-name">${businessName}</div>
            </div>

            <div class="contact-strip">
                ${hasContact ? `
                    ${phone ? `<div class="contact-item">${phone}</div>` : '<div></div>'}
                    ${website ? `<div class="contact-item">${website}</div>` : '<div></div>'}
                ` : ''}
            </div>
        </div>
    </body>
    </html>
    `;
}

export function getBoldTemplate(data: PosterTemplateData): string {
    const { photoBase64, logoBase64, businessName, customText, phone, website, primaryColor } = data;
    const hasContact = phone || website;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            ${baseStyles}
            .poster-container {
                background-color: ${primaryColor};
                display: flex;
                flex-direction: column;
            }
            .top-section {
                height: 600px;
                position: relative;
                width: 100%;
            }
            .bg-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .gradient-blend {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 150px;
                background: linear-gradient(to bottom, transparent, ${primaryColor});
            }
            .logo-box {
                position: absolute;
                top: 40px;
                left: 40px;
                width: 100px;
                height: 100px;
                background: white;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .logo-box img {
                max-width: 75px;
                max-height: 75px;
                object-fit: contain;
            }
            .bottom-section {
                flex: 1;
                padding: 40px 60px;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .custom-text {
                color: white;
                font-size: 64px;
                font-weight: 900;
                line-height: 1.05;
                margin-bottom: 20px;
                text-transform: uppercase;
            }
            .business-name {
                color: rgba(255,255,255,0.9);
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 4px;
                text-transform: uppercase;
                margin-bottom: 25px;
            }
            .divider {
                width: 100px;
                height: 5px;
                background: rgba(255,255,255,0.4);
                border-radius: 3px;
                margin-bottom: 30px;
            }
            .contact-row {
                display: flex;
                gap: 40px;
            }
            .contact-item {
                color: rgba(255,255,255,0.9);
                font-size: 24px;
                font-weight: 700;
            }
        </style>
    </head>
    <body>
        <div class="poster-container">
            <div class="top-section">
                <img class="bg-image" src="data:image/jpeg;base64,${photoBase64}" />
                <div class="gradient-blend"></div>
                ${logoBase64 ? `
                <div class="logo-box">
                    <img src="data:image/png;base64,${logoBase64}" />
                </div>
                ` : ''}
            </div>
            <div class="bottom-section">
                ${customText ? `<div class="custom-text">${customText}</div>` : ''}
                <div class="business-name">${businessName}</div>
                ${hasContact ? `
                    <div class="divider"></div>
                    <div class="contact-row">
                        ${phone ? `<div class="contact-item">📞 ${phone}</div>` : ''}
                        ${website ? `<div class="contact-item">🌐 ${website}</div>` : ''}
                    </div>
                ` : ''}
            </div>
        </div>
    </body>
    </html>
    `;
}

export function getLifestyleTemplate(data: PosterTemplateData): string {
    const { photoBase64, logoBase64, businessName, customText, phone, website, primaryColor } = data;
    const hasContact = phone || website;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            ${baseStyles}
            .poster-container {
                background-color: #F8F9FA;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 70px 50px 0 50px;
            }
            .top-bar {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 15px;
                background-color: ${primaryColor};
            }
            .logo-box {
                position: absolute;
                top: 40px;
                right: 40px;
                width: 90px;
                height: 90px;
                background: white;
                border: 3px solid #E9ECEF;
                border-radius: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .logo-box img {
                max-width: 65px;
                max-height: 65px;
                object-fit: contain;
            }
            .business-name {
                color: ${primaryColor};
                font-size: 36px;
                font-weight: 700;
                letter-spacing: 5px;
                text-transform: uppercase;
                margin-bottom: 40px;
                text-align: center;
                width: 100%;
            }
            .image-card {
                width: 900px;
                height: 600px;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                margin-bottom: 40px;
            }
            .bg-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .custom-text {
                color: #212529;
                font-size: 44px;
                font-weight: 900;
                text-align: center;
                margin-bottom: ${hasContact ? '25px' : '0'};
                line-height: 1.2;
                max-width: 900px;
            }
            .contact-row {
                display: flex;
                gap: 50px;
                justify-content: center;
            }
            .contact-item {
                color: #6C757D;
                font-size: 22px;
                font-weight: 700;
            }
            .bottom-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 15px;
                background-color: ${primaryColor};
            }
        </style>
    </head>
    <body>
        <div class="poster-container">
            <div class="top-bar"></div>
            
            ${logoBase64 ? `
            <div class="logo-box">
                <img src="data:image/png;base64,${logoBase64}" />
            </div>
            ` : ''}

            <div class="business-name">${businessName}</div>
            
            <div class="image-card">
                <img class="bg-image" src="data:image/jpeg;base64,${photoBase64}" />
            </div>

            ${customText ? `<div class="custom-text">${customText}</div>` : ''}

            ${hasContact ? `
            <div class="contact-row">
                ${phone ? `<div class="contact-item">${phone}</div>` : ''}
                ${website ? `<div class="contact-item">${website}</div>` : ''}
            </div>
            ` : ''}

            <div class="bottom-bar"></div>
        </div>
    </body>
    </html>
    `;
}

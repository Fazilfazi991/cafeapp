import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Terms of Service — Brand Pilot',
    description: 'Terms and conditions for using the Brand Pilot platform.',
}

export default function TermsOfServicePage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-16">
            <div className="mb-10">
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-3">Terms of Service</h1>
                <p className="text-sm text-gray-400">Last updated: March 2026 · Jurisdiction: United Arab Emirates</p>
            </div>

            <div className="space-y-10 text-[15px] leading-relaxed">

                <section>
                    <p className="text-gray-600">
                        Welcome to Brand Pilot. By accessing or using our platform at <strong className="text-[#1A1A1A]">brandpilot.ae</strong>, you agree to be bound by these Terms of Service. Please read them carefully. If you do not agree, you may not use the platform.
                    </p>
                </section>

                <Section title="1. About Brand Pilot">
                    <p>
                        Brand Pilot is a Software-as-a-Service (SaaS) platform that helps restaurants and food businesses manage their social media presence. Our core services include:
                    </p>
                    <ul>
                        <li>AI-powered poster and caption generation from uploaded food photos.</li>
                        <li>Automated scheduling and publishing to Facebook, Instagram, Google My Business, and WhatsApp Business.</li>
                        <li>Customer contact management and WhatsApp broadcast messaging.</li>
                        <li>A media library for storing branded content.</li>
                    </ul>
                </Section>

                <Section title="2. Eligibility & Account Registration">
                    <ul>
                        <li>You must be at least 18 years old and authorised to enter into a legally binding agreement on behalf of your business.</li>
                        <li>You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately at <a href="mailto:legal@brandpilot.ae">legal@brandpilot.ae</a> if you suspect unauthorised access.</li>
                        <li>You may only create one account per business unless otherwise agreed in writing.</li>
                    </ul>
                </Section>

                <Section title="3. Subscription & Billing">
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 font-medium">
                        Current pricing: <strong>500 AED per month</strong> per restaurant account.
                    </div>
                    <ul>
                        <li>Subscriptions are billed monthly. Payment is due at the start of each billing cycle.</li>
                        <li>We reserve the right to change pricing with at least 30 days' advance notice via email or in-app notification.</li>
                        <li>No refunds are issued for partial months. If you cancel, your access continues until the end of the paid period.</li>
                        <li>Accounts with failed payments may be suspended after a 7-day grace period.</li>
                        <li>Enterprise or multi-location pricing is available on request at <a href="mailto:legal@brandpilot.ae">legal@brandpilot.ae</a>.</li>
                    </ul>
                </Section>

                <Section title="4. User Responsibilities">
                    <p>By using Brand Pilot, you agree to:</p>
                    <ul>
                        <li>Only upload content (images, videos) that you own or have the license to use.</li>
                        <li>Obtain proper consent from all WhatsApp contacts before importing and messaging them. You bear sole legal responsibility for compliance with applicable messaging laws and Meta's WhatsApp Business policies.</li>
                        <li>Not use Brand Pilot for any unlawful, fraudulent, or deceptive purpose.</li>
                        <li>Not attempt to reverse engineer, circumvent, or abuse any part of our platform.</li>
                        <li>Ensure that all content published via Brand Pilot complies with the advertising standards and community guidelines of each social media platform.</li>
                    </ul>
                </Section>

                <Section title="5. Acceptable Use Policy">
                    <p>The following uses are strictly prohibited:</p>
                    <ul>
                        <li>Publishing spam, misinformation, hate speech, or illegal content via our platform.</li>
                        <li>Sending unsolicited WhatsApp messages to contacts who have not consented.</li>
                        <li>Attempting to bypass Meta's or Google's API rate limits in a way that could endanger other users' accounts.</li>
                        <li>Using AI-generated content to impersonate another business or individual.</li>
                    </ul>
                    <p>Violation of this policy may result in immediate account suspension without refund.</p>
                </Section>

                <Section title="6. Third-Party API Availability">
                    <p>
                        Brand Pilot relies on third-party APIs from Meta (Facebook, Instagram, WhatsApp) and Google (My Business, Gemini AI) to deliver its core functionality. We do not control the availability, performance, or policy changes of these APIs.
                    </p>
                    <ul>
                        <li>We make no guarantee of uptime for any third-party API integration.</li>
                        <li>We are not responsible for failed posts, lost content, or account suspensions caused by changes to Meta's or Google's platforms or policies.</li>
                        <li>Meta or Google may require you to re-authenticate periodically. We will notify you via in-app alerts when re-connection is needed.</li>
                    </ul>
                </Section>

                <Section title="7. Intellectual Property">
                    <ul>
                        <li>You retain ownership of all content you upload (photos, brand assets, menus).</li>
                        <li>AI-generated content (captions, posters) is generated for your use and you may use it commercially.</li>
                        <li>Brand Pilot, its logo, interface design, and underlying software are the intellectual property of Brand Pilot and may not be copied or reproduced without permission.</li>
                    </ul>
                </Section>

                <Section title="8. Limitation of Liability">
                    <p>
                        To the maximum extent permitted by UAE law, Brand Pilot shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to lost revenue, lost data, or damage to your social media accounts.
                    </p>
                    <p>
                        Our total liability to you in any calendar month shall not exceed the amount you paid us in that month.
                    </p>
                </Section>

                <Section title="9. Termination">
                    <ul>
                        <li>You may cancel your subscription at any time from your account settings or by contacting us.</li>
                        <li>We may terminate or suspend your account if you violate these Terms, with or without notice depending on severity.</li>
                        <li>Upon termination, your data is retained for 30 days before permanent deletion, during which you may request an export.</li>
                    </ul>
                </Section>

                <Section title="10. Governing Law">
                    <p>
                        These Terms are governed by and construed in accordance with the laws of the United Arab Emirates. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of the UAE.
                    </p>
                </Section>

                <Section title="11. Changes to These Terms">
                    <p>
                        We may update these Terms from time to time. We will notify you at least 14 days before any material changes take effect. Your continued use of Brand Pilot after changes take effect constitutes acceptance of the new terms.
                    </p>
                </Section>

                <Section title="12. Contact">
                    <p>For legal enquiries or to exercise your rights:</p>
                    <div className="bg-white border rounded-xl p-5 mt-3">
                        <p className="font-semibold text-[#1A1A1A] mb-1">Brand Pilot — Legal</p>
                        <p className="text-gray-600 text-sm">Email: <a href="mailto:legal@brandpilot.ae" className="text-[#FF6B35] hover:underline">legal@brandpilot.ae</a></p>
                        <p className="text-gray-600 text-sm">Website: <a href="https://brandpilot.ae" className="text-[#FF6B35] hover:underline">brandpilot.ae</a></p>
                    </div>
                </Section>

            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-4 pb-2 border-b border-gray-100">{title}</h2>
            <div className="text-gray-600 space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_a]:text-[#FF6B35] [&_strong]:text-[#1A1A1A]">
                {children}
            </div>
        </section>
    )
}

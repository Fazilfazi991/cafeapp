import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Privacy Policy — Brand Pilot',
    description: 'How Brand Pilot collects, uses, and protects your data.',
}

export default function PrivacyPolicyPage() {
    return (
        <div className="max-w-3xl mx-auto px-6 py-16">
            <div className="mb-10">
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-3">Privacy Policy</h1>
                <p className="text-sm text-gray-400">Last updated: March 2026 · Jurisdiction: United Arab Emirates</p>
            </div>

            <div className="prose prose-gray max-w-none space-y-10 text-[15px] leading-relaxed">

                <section>
                    <p className="text-gray-600">
                        Brand Pilot ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at <strong>brandpilot.ae</strong>. By using Brand Pilot, you agree to the practices described in this policy.
                    </p>
                </section>

                <Section title="1. Information We Collect">
                    <p>We collect the following categories of data:</p>
                    <ul>
                        <li><strong>Account Information:</strong> Your name and email address when you sign up.</li>
                        <li><strong>Restaurant Profile:</strong> Your restaurant name, logo, address, phone number, and brand settings you provide during onboarding.</li>
                        <li><strong>Social Media Tokens:</strong> Access tokens for connected platforms (Facebook, Instagram, Google My Business, WhatsApp Business) that allow us to publish on your behalf. These are stored encrypted in our database.</li>
                        <li><strong>Content You Upload:</strong> Images and videos you upload for post generation, which are stored securely in our cloud storage.</li>
                        <li><strong>Customer Contact Lists:</strong> If you use our WhatsApp broadcast feature, we store the phone numbers and names you import into the Contacts section. You are responsible for obtaining consent from these contacts.</li>
                        <li><strong>Usage Data:</strong> Basic analytics such as pages visited and features used, to help us improve the product.</li>
                    </ul>
                </Section>

                <Section title="2. How We Use Your Information">
                    <p>We use your data solely to operate and improve Brand Pilot:</p>
                    <ul>
                        <li>Authenticating your account and maintaining your session.</li>
                        <li>Publishing AI-generated posts to your connected social media platforms (Facebook, Instagram, Google My Business).</li>
                        <li>Sending WhatsApp broadcast messages to your imported customer contacts on your behalf.</li>
                        <li>Generating AI-powered captions and poster images using your restaurant's brand details.</li>
                        <li>Scheduling and queueing posts for future delivery.</li>
                        <li>Sending in-app notifications about token expiries or connection issues.</li>
                        <li>Improving our AI models and product features using anonymised, aggregated usage patterns.</li>
                    </ul>
                    <p>We <strong>do not</strong> sell your personal data to any third party.</p>
                </Section>

                <Section title="3. Third-Party Services">
                    <p>Brand Pilot integrates with the following third-party services to deliver its functionality. Each is governed by their own privacy policies:</p>
                    <ul>
                        <li><strong>Meta (Facebook & Instagram):</strong> Used for social media publishing and WhatsApp Business API access. <a href="https://www.facebook.com/policy.php" className="text-[#FF6B35] hover:underline" target="_blank" rel="noopener noreferrer">Meta Privacy Policy</a></li>
                        <li><strong>Google (My Business & Gemini AI):</strong> Used for Google My Business publishing and AI image/caption generation. <a href="https://policies.google.com/privacy" className="text-[#FF6B35] hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
                        <li><strong>WhatsApp Business API:</strong> Used to send broadcast messages to your imported contacts. Messages are subject to Meta's business messaging policies.</li>
                        <li><strong>Supabase:</strong> Our cloud database and authentication provider, hosted on secure infrastructure. <a href="https://supabase.com/privacy" className="text-[#FF6B35] hover:underline" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a></li>
                        <li><strong>Vercel:</strong> Our hosting provider for the application. <a href="https://vercel.com/legal/privacy-policy" className="text-[#FF6B35] hover:underline" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a></li>
                    </ul>
                </Section>

                <Section title="4. Data Retention">
                    <ul>
                        <li>Your account data is retained for as long as your subscription is active.</li>
                        <li>Social media access tokens are automatically refreshed and stored securely; they are deleted immediately upon disconnection.</li>
                        <li>Uploaded media files are stored indefinitely unless you manually delete them from the Media Library.</li>
                        <li>Customer contact phone numbers are stored until you delete them from your Contacts page or request account deletion.</li>
                        <li>Post records (including delivery stats) are retained for 2 years for your records.</li>
                    </ul>
                </Section>

                <Section title="5. Your Rights">
                    <p>As a user, you have the right to:</p>
                    <ul>
                        <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                        <li><strong>Correction:</strong> Update inaccurate information via your account settings.</li>
                        <li><strong>Deletion:</strong> Request that we delete your account and all associated data. We will process this within 30 days.</li>
                        <li><strong>Opt-out of WhatsApp broadcasts:</strong> Your customers can reply "STOP" to any message to be automatically removed from your contact list.</li>
                        <li><strong>Data Portability:</strong> Request an export of your data in a machine-readable format.</li>
                    </ul>
                    <p>To exercise any of these rights, contact us at <a href="mailto:privacy@brandpilot.ae" className="text-[#FF6B35] hover:underline">privacy@brandpilot.ae</a>.</p>
                </Section>

                <Section title="6. Security">
                    <p>
                        We use industry-standard security measures including encrypted connections (HTTPS/TLS), encrypted storage of sensitive tokens, and role-based access controls. While we take reasonable precautions, no internet transmission is 100% secure and we cannot guarantee absolute security.
                    </p>
                </Section>

                <Section title="7. UAE Jurisdiction & Compliance">
                    <p>
                        Brand Pilot operates under the laws of the United Arab Emirates. This policy is intended to comply with the UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection. If you have concerns about how we handle your data, you may contact the UAE Data Office.
                    </p>
                </Section>

                <Section title="8. Changes to This Policy">
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app banner. Your continued use of Brand Pilot after changes take effect constitutes your acceptance of the revised policy.
                    </p>
                </Section>

                <Section title="9. Contact Us">
                    <p>For any privacy-related questions or requests:</p>
                    <div className="bg-white border rounded-xl p-5 mt-3 not-prose">
                        <p className="font-semibold text-[#1A1A1A] mb-1">Brand Pilot — Privacy Team</p>
                        <p className="text-gray-600 text-sm">Email: <a href="mailto:privacy@brandpilot.ae" className="text-[#FF6B35] hover:underline">privacy@brandpilot.ae</a></p>
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

// src/app/privacy/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
  const appName = "EcoDash";
  const contactEmail = "support@example.com"; // REPLACE with your actual support email
  const lastUpdated = "July 27, 2024"; // REPLACE with the current date

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-4 sm:py-6 border-b sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            {appName}
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">← Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl py-8 md:py-12 px-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8 text-center">Last Updated: {lastUpdated}</p>

        <section className="space-y-6">
          <p>{appName} ("us", "we", or "our") operates the {appName} website and services (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">1. Information Collection and Use</h2>
          <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>

          <h3 className="text-xl font-medium pt-2">Types of Data Collected</h3>
          <p className="font-semibold mt-2">Personal Data:</p>
          <ul className="list-disc list-inside space-y-1 pl-4 text-muted-foreground">
            <li>Email address (when you register or contact us)</li>
            <li>Name and/or Username (when you register)</li>
            <li>Payment Information (if you subscribe to paid services, processed by Stripe, not stored by us directly)</li>
            <li>Favorite indicators (if you use this feature)</li>
            <li>Usage Data (see below)</li>
          </ul>

          <p className="font-semibold mt-2">Usage Data:</p>
          <p>We may also collect information on how the Service is accessed and used ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g., IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers, and other diagnostic data.</p>
          
          {/* If using Google Analytics or similar */}
          {/* 
          <p className="font-semibold mt-2">Tracking & Cookies Data:</p>
          <p>We use cookies and similar tracking technologies to track the activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.</p>
          */}

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">2. Use of Data</h2>
          <p>{appName} uses the collected data for various purposes:</p>
          <ul className="list-disc list-inside space-y-1 pl-4 text-muted-foreground">
            <li>To provide and maintain our Service</li>
            <li>To notify you about changes to our Service</li>
            <li>To allow you to participate in interactive features of our Service when you choose to do so (e.g., favorites)</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information so that we can improve our Service</li>
            <li>To monitor the usage of our Service</li>
            <li>To detect, prevent and address technical issues</li>
            <li>To process your payments and manage subscriptions (if applicable)</li>
          </ul>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">3. Data Storage and Security</h2>
          <p>The security of your data is important to us. We strive to use commercially acceptable means to protect your Personal Data, such as encryption for passwords. However, remember that no method of transmission over the Internet or method of electronic storage is 100% secure.</p>
          <p>Your information, including Personal Data, may be transferred to — and maintained on — computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those from your jurisdiction.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">4. Service Providers</h2>
          <p>We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services, or to assist us in analyzing how our Service is used.</p>
          <ul className="list-disc list-inside space-y-1 pl-4 text-muted-foreground">
            <li>**NextAuth & Prisma:** For user authentication and database management.</li>
            <li>**Stripe:** For payment processing for subscriptions (if applicable). We do not store your full payment card details. Stripe's Privacy Policy can be viewed on their website.</li>
            <li>**Resend:** For sending transactional emails (e.g., password resets, welcome emails).</li>
            <li>**Vercel (or your hosting provider):** For hosting the application.</li>
            <li>**Third-Party Data APIs (FRED, Alpha Vantage, etc.):** We fetch data from these sources. We do not send your personal data to them.</li>
          </ul>
          <p>These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">5. Your Data Rights</h2>
          <p>Depending on your location, you may have certain rights regarding your personal data, including:</p>
          <ul className="list-disc list-inside space-y-1 pl-4 text-muted-foreground">
            <li>The right to access, update or delete the information we have on you (typically via your account profile or by contacting us).</li>
            <li>The right of rectification.</li>
            <li>The right to object.</li>
            <li>The right of restriction.</li>
            <li>The right to data portability.</li>
            <li>The right to withdraw consent.</li>
          </ul>
          <p>Please contact us at <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a> if you wish to exercise any of these rights or have questions about your data.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">6. Children's Privacy</h2>
          <p>Our Service does not address anyone under the age of 13 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your Children has provided us with Personal Data, please contact us.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">7. Changes to This Privacy Policy</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">8. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a>.</p>
        </section>
      </main>
    </div>
  );
}
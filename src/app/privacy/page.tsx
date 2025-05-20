// File: src/app/privacy/page.tsx
// NEW FILE
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl py-8 md:py-12 px-4">
      <header className="py-4 sm:py-6 border-b mb-8">
        <div className="container mx-auto px-0 flex justify-between items-center">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
                EcoDash
            </Link>
            <Link href="/dashboard">
                <Button variant="outline" size="sm">← Back to Dashboard</Button>
            </Link>
        </div>
      </header>
      <article className="prose dark:prose-invert max-w-none"> {/* Added prose for styling */}
          <h1>Privacy Policy (Beta Program)</h1>
          <p>Last Updated: {new Date().toLocaleDateString()}</p>
          <p>This Privacy Policy describes how EcoDash ("we," "us," or "our") collects, uses, and shares information in connection with your use of our beta software and services (the "Service").</p>

          <h2>1. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li><strong>Account Information:</strong> If you create an account, we collect information you provide, such as your name, email address, username, and encrypted password (if using credentials). If you use Google Sign-In, we receive profile information from Google according to your Google account settings and permissions you grant.</li>
            <li><strong>Subscription Information:</strong> If you subscribe to a paid plan, our payment processor (Stripe) will collect and process your payment information. We store your Stripe Customer ID, subscription status, and plan details to manage your access.</li>
            <li><strong>Usage Data (Beta Phase):</strong> We may collect anonymized or aggregated information about how you interact with the Service, such as features used and general navigation patterns. This data helps us identify areas for improvement during the beta phase. We strive to minimize collection of personally identifiable usage data.</li>
            <li><strong>Favorites:</strong> If you use the "favorites" feature, we store the list of indicators you have favorited, associated with your user account.</li>
            <li><strong>Feedback & Contact:</strong> Information you provide when you contact us via our contact form or other feedback channels, including your email address and the content of your message.</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, secure, and maintain the Service.</li>
            <li>Process your subscriptions and payments.</li>
            <li>Authenticate you and manage your account.</li>
            <li>Communicate with you, including responding to your inquiries, sending important service-related announcements (e.g., updates to terms, major feature changes), and providing customer support.</li>
            <li>Improve and personalize the Service based on beta feedback and aggregated usage patterns.</li>
            <li>Prevent fraud and ensure the security of our Service.</li>
            <li>Comply with legal obligations.</li>
          </ul>

          <h2>3. Information Sharing and Disclosure</h2>
          <p>We do not sell your personal information.</p>
          <p>We may share information with the following third-party service providers who assist us in operating the Service, under strict confidentiality agreements where applicable:</p>
          <ul>
            <li><strong>Payment Processor:</strong> Stripe, Inc. for processing subscriptions and payments.</li>
            <li><strong>Email Delivery:</strong> Resend, Inc. for sending transactional emails (e.g., password resets, welcome emails, contact form responses).</li>
            <li><strong>Hosting Provider:</strong> (e.g., Vercel) for hosting the application.</li>
            <li><strong>Analytics Providers (Beta):</strong> We may use analytics tools to understand beta usage in an aggregated, de-identified manner.</li>
          </ul>
          <p>We may also disclose information if required by law, regulation, or legal process, or in the good faith belief that such action is necessary to: (a) comply with legal obligations; (b) protect and defend our rights or property; (c) prevent or investigate possible wrongdoing in connection with the Service; or (d) protect the personal safety of users of the Service or the public.</p>

          <h2>4. Data Security</h2>
          <p>We implement reasonable administrative, technical, and physical security measures to protect your information from unauthorized access, use, alteration, or destruction. However, no internet-based site can be 100% secure, so we cannot guarantee absolute security.</p>

          <h2>5. Your Choices and Rights</h2>
          <p>You can typically access and update your account information (name, email) through your profile page within the Service. You may request deletion of your account by contacting us, subject to our data retention policies and legal obligations (e.g., for transactional records).</p>

          <h2>6. Data Retention</h2>
          <p>We retain your personal information for as long as your account is active or as needed to provide you with the Service, comply with our legal obligations, resolve disputes, and enforce our agreements.</p>
          
          <h2>7. Children's Privacy</h2>
          <p>The Service is not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will take steps to delete such information.</p>

          <h2>8. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time, especially during the beta phase. We will notify you of any material changes by posting the new Privacy Policy on this page and, if feasible, through other communication channels. You are advised to review this Privacy Policy periodically for any changes.</p>
          
          <h2>9. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us via the <Link href="/contact" className="underline">contact page</Link> on our website.</p>
      </article>
    </div>
  );
}
// File: src/app/terms/page.tsx
// NEW FILE
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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
        <h1>Terms of Service (Beta Program)</h1>
        <p>Last Updated: {new Date().toLocaleDateString()}</p>
        <p>Welcome to the EcoDash Beta Program ("Service"). These Terms of Service ("Terms") govern your access to and use of our beta software, website, and related services. By accessing or using the Service, you agree to be bound by these Terms.</p>

        <h2>1. Beta Service Disclaimer</h2>
        <p><strong>"AS IS" Basis:</strong> You acknowledge and agree that the Service is a beta version and is provided on an "as is" and "as available" basis. It is currently under development and may contain bugs, errors, omissions, and inaccuracies. The Service may be incomplete and may not function as expected or be entirely stable.</p>
        <p><strong>No Guarantees:</strong> We make no warranties, express or implied, regarding the reliability, availability, timeliness, security, accuracy, or performance of the Service. Features may be added, modified, or removed without prior notice. Your use of the Service is solely at your own risk.</p>

        <h2>2. Eligibility and Access</h2>
        <p>You must be at least 13 years old to use the Service. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.</p>

        <h2>3. User Accounts</h2>
        <p>To access certain features, you may need to register for an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>

        <h2>4. User Conduct</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
            <li>Violate any applicable laws or regulations.</li>
            <li>Infringe upon the rights of others, including intellectual property rights.</li>
            <li>Transmit any harmful, offensive, or illegal content.</li>
            <li>Attempt to gain unauthorized access to our systems or other users' accounts.</li>
            <li>Disrupt or interfere with the security or performance of the Service.</li>
        </ul>

        <h2>5. Feedback</h2>
        <p>We welcome and encourage you to provide feedback, comments, suggestions, and bug reports regarding the Service ("Feedback"). By submitting Feedback, you grant EcoDash a perpetual, irrevocable, non-exclusive, worldwide, royalty-free, fully paid-up license to use, reproduce, modify, create derivative works from, distribute, display, and otherwise exploit such Feedback for any purpose, including incorporation into our products and services, without any compensation or attribution to you.</p>

        <h2>6. Data Disclaimer & No Financial Advice</h2>
        <p className="font-semibold text-destructive dark:text-red-400">IMPORTANT: All data, charts, analyses, signals, and information provided by EcoDash are for informational and educational purposes ONLY. They should NOT be considered as financial advice, investment recommendations, trading advice, or an endorsement of any particular investment, security, or strategy. EcoDash is NOT a financial advisor, broker, or dealer.</p>
        <p>The economic and financial data presented may be sourced from third-party providers and may contain delays, inaccuracies, or omissions. We do not guarantee the accuracy, completeness, timeliness, or reliability of any data or information provided by the Service. You should always conduct your own thorough research and consult with a qualified, licensed financial professional before making any investment or financial decisions. Decisions based on information contained within the Service are your sole responsibility, and you agree that EcoDash and its creators are not liable for any losses, damages, or costs arising from your use of or reliance on the information provided.</p>

        <h2>7. Subscription and Payments (If Applicable)</h2>
        <p>If the Service offers paid subscription plans, the terms related to payments, fees, renewals, and cancellations will be governed by our payment processor's terms (Stripe) and specific details provided at the time of subscription. We reserve the right to change our subscription fees and plans with reasonable notice.</p>

        <h2>8. Intellectual Property</h2>
        <p>The Service and its original content (excluding user-provided Feedback and third-party data), features, and functionality are and will remain the exclusive property of EcoDash and its licensors. The Service is protected by copyright, trademark, and other laws.</p>

        <h2>9. Termination</h2>
        <p>We may terminate or suspend your access to the Beta Service immediately, without prior notice or liability, for any reason whatsoever, including, without limitation, if you breach these Terms. Upon termination, your right to use the Service will immediately cease.</p>

        <h2>10. Limitation of Liability</h2>
        <p>To the maximum extent permitted by applicable law, in no event shall EcoDash, its affiliates, directors, employees, or licensors be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages, including without limitation damages for loss of profits, goodwill, use, data, or other intangible losses, arising out of or relating to the use of, or inability to use, the Service, even if we have been advised of the possibility of such damages.</p>

        <h2>11. Governing Law</h2>
        <p>These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction - e.g., State of California, USA], without regard to its conflict of law provisions.</p>

        <h2>12. Changes to Terms</h2>
        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will make reasonable efforts to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>

        <h2>13. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us via the <Link href="/contact" className="underline">contact page</Link> on our website.</p>
      </article>
    </div>
  );
}
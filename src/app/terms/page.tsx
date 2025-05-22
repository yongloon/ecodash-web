// src/app/terms/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // If you want a back button

export default function TermsPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8 text-center">Last Updated: {lastUpdated}</p>

        <section className="space-y-6">
          <p>Welcome to {appName}! These Terms of Service ("Terms") govern your access to and use of the {appName} website, applications, and services (collectively, the "Service"). Please read these Terms carefully before using the Service.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">1. Acceptance of Terms</h2>
          <p>By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service. This Service is currently in a Beta phase, and as such, features and functionality may change, and unforeseen issues may arise.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">2. Beta Service</h2>
          <p>You acknowledge that the Service is a beta version and is made available on an "As Is" and "As Available" basis for the purpose of providing {appName} with feedback on the quality and usability of the Service. The Service may contain bugs, errors, and other problems. You assume all risks and all costs associated with your use of the Service.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">3. Use of the Service</h2>
          <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You are responsible for ensuring that your use of the Service complies with all applicable laws, rules, and regulations.</p>
          <p>You agree not to use the Service:</p>
          <ul className="list-disc list-inside space-y-1 pl-4 text-muted-foreground">
            <li>In any way that violates any applicable national or international law or regulation.</li>
            <li>To attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of the Service, the server on which the Service is stored, or any server, computer, or database connected to the Service.</li>
            <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the Service, or which, as determined by us, may harm {appName} or users of the Service.</li>
          </ul>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">4. User Accounts</h2>
          <p>If you create an account on the Service, you are responsible for maintaining the security of your account and you are fully responsible for all activities that occur under the account. You must immediately notify us of any unauthorized uses of your account or any other breaches of security.</p>

          {(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY) && (
            <>
              <h2 className="text-2xl font-semibold pt-4 border-t mt-8">5. Subscriptions and Payments (If Applicable)</h2>
              <p>If you subscribe to paid features of the Service, you agree to pay all applicable fees. Payments are processed through a third-party payment processor (Stripe). All payment information is handled by the third-party processor, and we do not store your full credit card information.</p>
              <p>Subscriptions may be managed, and you can cancel your subscription, through your account settings or by contacting us. Cancellations will typically take effect at the end of the current billing period.</p>
            </>
          )}

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">6. Intellectual Property</h2>
          <p>The Service and its original content (excluding content provided by users or third-party data sources), features, and functionality are and will remain the exclusive property of {appName} and its licensors. The Service is protected by copyright, trademark, and other laws.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">7. Data Disclaimer & No Financial Advice</h2>
          <p className="font-semibold text-destructive">All data, charts, insights, and information provided by {appName} are for informational and educational purposes only. They should not be construed as financial, investment, trading, or any other form of advice or recommendation.</p>
          <p>You acknowledge that {appName} is not a financial advisor, broker, or dealer. Any decisions you make based on information from the Service are made at your own risk. {appName} does not guarantee the accuracy, completeness, timeliness, or reliability of any data provided. Always conduct your own research and consult with a qualified financial professional before making any investment decisions.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">8. Limitation of Liability</h2>
          <p>In no event shall {appName}, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage, and even if a remedy set forth herein is found to have failed of its essential purpose.</p>
          <p>As this is a Beta Service, {appName} provides the service "as is", "with all faults" and "as available", and the entire risk as to satisfactory quality, performance, accuracy, and effort is with you.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">9. Changes to Terms</h2>
          <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will make reasonable efforts to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">10. Governing Law</h2>
          <p>These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction - e.g., State of California, USA], without regard to its conflict of law provisions.</p>

          <h2 className="text-2xl font-semibold pt-4 border-t mt-8">11. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">{contactEmail}</a>.</p>
        </section>
      </main>
    </div>
  );
}
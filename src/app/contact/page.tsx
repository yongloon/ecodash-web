// src/app/contact/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ContactForm from '@/components/ContactForm'; // Import the new client component
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // For the "Back to Dashboard" button

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
       {/* Optional Simple Header for Standalone Page */}
       <div className="absolute top-0 left-0 right-0 py-4 sm:py-6 border-b">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
                EcoDash
            </Link>
            <Link href="/dashboard"> {/* Or simply "/" if that's your dashboard home */}
                <Button variant="ghost" size="sm">← Back to Dashboard</Button>
            </Link>
            </div>
        </div>

      <Card className="w-full max-w-2xl mt-20 sm:mt-24"> {/* Added margin-top for header */}
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Contact Us</CardTitle>
          <CardDescription>
            Have questions or feedback? We'd love to hear from you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm /> {/* Use the client component here */}
        </CardContent>
      </Card>
    </div>
  );
}
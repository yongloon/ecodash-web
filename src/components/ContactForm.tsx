// src/components/ContactForm.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

// Define the server action (can be in this file or imported)
async function submitContactFormAction(formData: FormData) {
  // "use server"; // Server Action directive if defined in the same file or a separate actions.ts
  console.log("Server Action: Form submission started.");
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;

  // Simulate delay and processing
  await new Promise(resolve => setTimeout(resolve, 1500));

  if (!name || !email || !subject || !message) {
    console.error("Server Action Error: All fields are required.");
    return { success: false, error: "All fields are required." };
  }

  // Here you would:
  // 1. Validate the data further.
  // 2. Send an email using Resend (e.g., to yourself with the contact message).
  //    const { data, error } = await resend.emails.send({...});
  // 3. Or save to a database if needed.

  console.log("Server Action: Contact Form Data:", { name, email, subject, message });
  // Example: Send email to yourself
  // try {
  //   const { data, error } = await resend.emails.send({
  //     from: 'Contact Form <onboarding@resend.dev>', // Your verified Resend domain
  //     to: ['your-email@example.com'], // Your email
  //     subject: `New Contact Form Submission: ${subject}`,
  //     reply_to: email,
  //     html: `<p>Name: ${name}</p><p>Email: ${email}</p><p>Subject: ${subject}</p><p>Message: ${message}</p>`,
  //   });
  //   if (error) throw error;
  //   return { success: true, message: "Message sent successfully!" };
  // } catch (e) {
  //   console.error("Server Action Error sending email:", e);
  //   return { success: false, error: "Failed to send message." };
  // }
  return { success: true, message: "Message sent successfully! (Simulated)" };
}


export default function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<{ success: boolean | null; message: string | null; error: string | null }>({
    success: null,
    message: null,
    error: null,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
        // If submitContactFormAction is defined with "use server" in another file:
        // const result = await submitContactFormAction(formData); 
        
        // If submitContactFormAction is defined in this file (needs "use server" at its top if so, or call API)
        // For this example, assuming it's a local async function that simulates server action behavior
        const result = await submitContactFormAction(formData);
        
        if (result.success) {
            setFormState({ success: true, message: result.message, error: null });
            (event.target as HTMLFormElement).reset(); // Reset form on success
        } else {
            setFormState({ success: false, message: null, error: result.error });
        }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formState.message && <p className={`text-sm p-3 rounded-md ${formState.success ? 'bg-green-500/10 text-green-700' : 'bg-destructive/10 text-destructive'}`}>{formState.message}</p>}
      {formState.error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{formState.error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="name_contact_form" className="text-sm font-medium">Full Name</label>
          <Input id="name_contact_form" name="name" placeholder="John Doe" required disabled={isPending} />
        </div>
        <div className="space-y-2">
          <label htmlFor="email_contact_form" className="text-sm font-medium">Email Address</label>
          <Input id="email_contact_form" name="email" type="email" placeholder="you@example.com" required disabled={isPending} />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="subject_contact_form" className="text-sm font-medium">Subject</label>
        <Input id="subject_contact_form" name="subject" placeholder="Question about Pro Plan" required disabled={isPending} />
      </div>
      <div className="space-y-2">
        <label htmlFor="message_contact_form" className="text-sm font-medium">Message</label>
        <Textarea id="message_contact_form" name="message" placeholder="Your message..." rows={5} required disabled={isPending} />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  );
}
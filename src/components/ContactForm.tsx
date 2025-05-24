// File: src/components/ContactForm.tsx
"use client";

import React, { useTransition, FormEvent, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { submitContactFormAction } from '@/app/actions';
import { useFormState } from 'react-dom';
import toast from 'react-hot-toast'; // <<< ADD THIS

const initialState = {
  success: null as boolean | null,
  message: null as string | null,
  error: null as string | null,
};

export default function ContactForm() {
  const [formState, formAction] = useFormState(submitContactFormAction, initialState);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (formState.success === true && formRef.current) {
      toast.success(formState.message || "Message sent successfully!");
      formRef.current.reset();
    } else if (formState.success === false && formState.error) {
      toast.error(formState.error);
    }
    // Reset message/error from formState so toasts don't reappear on unrelated re-renders
    // This is tricky with useFormState as it holds the state.
    // A more complex solution might involve a local state reset after toast.
  }, [formState]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(() => {
        formAction(formData);
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6"> 
      {/* We'll rely on toasts now, so can remove direct message rendering here if desired */}
      {/* Or keep them as a fallback / more persistent message */}
      {/* {formState.message && !formState.success && (
        <p className="text-sm p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
          {formState.message}
        </p>
      )} */}
      
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
        <Input id="subject_contact_form" name="subject" placeholder="Feedback about..." required disabled={isPending} />
      </div>
      <div className="space-y-2">
        <label htmlFor="message_contact_form" className="text-sm font-medium">Message</label>
        <Textarea id="message_contact_form" name="message" placeholder="Your detailed feedback or question..." rows={5} required disabled={isPending} />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  );
}
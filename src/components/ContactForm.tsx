// File: src/components/ContactForm.tsx
"use client";

import React, { useState, useTransition, FormEvent, useRef, useEffect } from 'react'; // Added useRef, useEffect
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { submitContactFormAction } from '@/app/actions'; // Adjust path if you put actions.ts elsewhere (e.g., '@/lib/actions')
import { useFormState } from 'react-dom'; // Recommended for handling form state with server actions

const initialState = {
  success: null as boolean | null,
  message: null as string | null,
  error: null as string | null,
};

export default function ContactForm() {
  // Using useFormState for better state management with server actions
  const [formState, formAction] = useFormState(submitContactFormAction, initialState);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null); // Ref to reset the form

  // Effect to reset the form if submission was successful
  useEffect(() => {
    if (formState.success === true && formRef.current) {
      formRef.current.reset();
    }
  }, [formState.success]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(() => {
        formAction(formData); // Directly call the action wrapped by useFormState
    });
  };

  return (
    // Pass formAction to the <form> element's action prop when using useFormState directly
    // Or handle with onSubmit and startTransition as shown
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6"> 
      {formState.message && (
        <p className={`text-sm p-3 rounded-md ${formState.success ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
          {formState.message}
        </p>
      )}
      {formState.error && (
        <p className="text-sm p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
          {formState.error}
        </p>
      )}
      
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
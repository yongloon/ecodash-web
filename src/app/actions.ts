// File: src/app/actions.ts (or src/lib/actions.ts)
"use server"; // Module-level directive: THIS ENTIRE FILE CONTAINS SERVER ACTIONS

import { Resend } from 'resend';

// These environment variables are now correctly accessed on the server
const resendApiKey = process.env.RESEND_API_KEY;
const contactFormRecipient = process.env.CONTACT_FORM_RECIPIENT_EMAIL;
const emailFromAddress = process.env.EMAIL_FROM_ADDRESS || 'EcoDash Beta Feedback <feedback@yourdomain.com>';

export async function submitContactFormAction(
    prevState: any, // Recommended for useFormState, can be null if not using it
    formData: FormData
): Promise<{ success: boolean; message?: string; error?: string; }> {
  
  console.log("Server Action: Contact form submission received via actions.ts.");
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !subject || !message) {
    console.error("Server Action Error: All fields are required.");
    return { success: false, error: "All fields are required." };
  }
  
  if (!resendApiKey || !contactFormRecipient) {
    console.error("Server Action Error: Resend API key or recipient email is not configured for contact form.");
    return { success: false, error: "Contact form is temporarily unavailable. Please try again later or contact support." };
  }

  const resend = new Resend(resendApiKey);

  try {
    const { data, error: resendError } = await resend.emails.send({
      from: emailFromAddress,
      to: [contactFormRecipient],
      reply_to: email,
      subject: `EcoDash Beta Feedback: ${subject} (from ${name})`, // Include name in subject for easier tracking
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    if (resendError) {
      console.error("Resend error sending contact email:", resendError);
      return { success: false, error: "Failed to send message due to a server error. Please try again." };
    }
    console.log("Contact email sent successfully via Resend:", data);
    return { success: true, message: "Your message has been sent! We'll get back to you if a response is needed." };
  } catch (e: any) {
    console.error("Server Action Exception sending contact email:", e);
    return { success: false, error: "An unexpected error occurred while sending your message." };
  }
}
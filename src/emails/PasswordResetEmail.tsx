// src/emails/PasswordResetEmail.tsx
import * as React from 'react';
import { Html, Button, Heading, Text, Hr, Container, Section } from '@react-email/components'; // You might need to install @react-email/components

interface PasswordResetEmailProps {
  userFirstname?: string | null;
  resetPasswordLink: string;
}

export const PasswordResetEmail: React.FC<Readonly<PasswordResetEmailProps>> = ({
  userFirstname,
  resetPasswordLink,
}) => (
  <Html>
    <Container style={main}>
      <Section style={content}>
        <Heading style={heading}>Reset Your Password</Heading>
        <Text style={paragraph}>Hi {userFirstname || 'there'},</Text>
        <Text style={paragraph}>
          Someone requested a password reset for your EcoDash account. If this was you,
          click the button below to set a new password. This link will expire in 1 hour.
        </Text>
        <Button style={button} href={resetPasswordLink}>
          Reset Password
        </Button>
        <Text style={paragraph}>
          If you didn't request a password reset, you can safely ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          EcoDash Team
        </Text>
      </Section>
    </Container>
  </Html>
);

export default PasswordResetEmail;

// Basic styles (inline for email compatibility)
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: '20px 0',
};
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  border: '1px solid #f0f0f0',
  borderRadius: '4px',
};
const content = {
  padding: '0 20px',
};
const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#333',
};
const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#555',
};
const button = {
  backgroundColor: '#5E5DF0', // Example button color
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
  fontWeight: 'bold',
};
const hr = {
  borderColor: '#f0f0f0',
  margin: '20px 0',
};
const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};
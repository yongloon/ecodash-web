// src/emails/WelcomeSubscriberEmail.tsx
import * as React from 'react';
import { Html, Button, Heading, Text, Hr, Container, Section, Link as EmailLink, Preview } from '@react-email/components';

interface WelcomeSubscriberEmailProps {
  userName?: string | null;
  planName?: string; // e.g., "Pro", "Basic"
}

const APP_NAME = "EcoDash";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const WelcomeSubscriberEmail: React.FC<Readonly<WelcomeSubscriberEmailProps>> = ({
  userName,
  planName = "our premium service",
}) => (
  <Html>
    <Preview>Welcome to {APP_NAME} {planName ? planName : ''}!</Preview>
    <Container style={main}>
      <Section style={content}>
        <Heading style={heading}>Welcome to {APP_NAME} {planName ? planName : ''}!</Heading>
        <Text style={paragraph}>Hi {userName || 'there'},</Text>
        <Text style={paragraph}>
          Thank you for subscribing to {APP_NAME} {planName}! We're thrilled to have you on board.
          You now have access to enhanced features to help you track and analyze economic indicators.
        </Text>
        
        {planName?.toLowerCase().includes('pro') && (
            <>
                <Text style={paragraph}>Here are a few things you can do now with your Pro access:</Text>
                <ul style={{ ...paragraph, paddingLeft: '20px' }}>
                    <li>Explore advanced analytics like Moving Averages.</li>
                    <li>Access extended historical data for deeper insights.</li>
                    <li>Export data in CSV format for your own analysis.</li>
                </ul>
            </>
        )}

        <Button style={button} href={`${APP_URL}/dashboard`}>
          Go to Your Dashboard
        </Button>
        <Text style={paragraph}>
          If you have any questions or need help getting started, please don't hesitate to
          contact our support team (if you have a support email).
        </Text>
        <Text style={paragraph}>
          You can manage your subscription anytime from your <EmailLink href={`${APP_URL}/account/profile`} style={link}>account profile</EmailLink>.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          The {APP_NAME} Team
        </Text>
      </Section>
    </Container>
  </Html>
);

export default WelcomeSubscriberEmail;

// Basic styles (inline for email compatibility)
const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif', padding: '20px 0', };
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 40px 48px', marginBottom: '64px', border: '1px solid #f0f0f0', borderRadius: '4px', };
const content = { padding: '0px' }; // Adjusted padding
const heading = { fontSize: '24px', fontWeight: 'bold', color: '#333', textAlign: 'center' as const, marginBottom: '20px' };
const paragraph = { fontSize: '16px', lineHeight: '26px', color: '#555', };
const button = { backgroundColor: '#007bff', borderRadius: '6px', color: '#fff', fontSize: '16px', textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '12px 20px', margin: '20px auto', fontWeight: 'bold', width: 'fit-content' };
const link = { color: '#007bff', textDecoration: 'underline' };
const hr = { borderColor: '#f0f0f0', margin: '20px 0', };
const footer = { color: '#8898aa', fontSize: '12px', lineHeight: '16px', textAlign: 'center' as const };
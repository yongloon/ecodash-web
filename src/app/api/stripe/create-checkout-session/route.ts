// src/app/api/stripe/create-checkout-session/route.ts
// ... (imports and existing logic) ...

export async function POST(request: Request) {
  // ... (session check, user fetch, stripeCustomerId logic) ...
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) { /* ... */ }
  const userId = (session.user as any).id;

  try {
    const { priceId, quantity = 1 } = await request.json();
    if (!priceId) { /* ... */ }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { /* ... */ }
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) { /* ... create customer ... */ }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const stripeSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [{ price: priceId, quantity }],
      mode: 'subscription',
      // --- MODIFIED SUCCESS URL ---
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`, 
      cancel_url: `${appUrl}/pricing`,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ sessionId: stripeSession.id });

  } catch (error: any) { /* ... */ }
}
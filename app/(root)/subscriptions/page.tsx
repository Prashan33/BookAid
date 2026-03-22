import { PricingTable } from "@clerk/nextjs";

import { CLERK_PRICING_TABLE_APPEARANCE } from "@/lib/constants";

export default function SubscriptionsPage() {
  const isBillingEnabled = process.env.NEXT_PUBLIC_CLERK_BILLING_ENABLED === "true";

  return (
    <main className="page-shell">
      <section className="subscriptions-page wrapper">
        <div className="subscriptions-hero">
          <p className="subscriptions-eyebrow">Subscriptions</p>
          <h1 className="page-title-xl">Choose the reading plan that fits your pace</h1>
          <p className="subtitle max-w-3xl">
            Free users can upload one book and start a few short sessions each month. Standard and
            Pro unlock larger libraries, longer conversations, and more monthly usage.
          </p>
        </div>

        {isBillingEnabled ? (
          <div className="clerk-pricing-container">
            <PricingTable
              appearance={CLERK_PRICING_TABLE_APPEARANCE}
              checkoutProps={{ appearance: CLERK_PRICING_TABLE_APPEARANCE }}
            />
          </div>
        ) : (
          <div className="subscriptions-disabled-state">
            <h2 className="section-title">Billing is not enabled yet</h2>
            <p className="subtitle max-w-2xl text-center">
              Enable Clerk Billing in the Clerk Dashboard, then set
              {" "}
              <code>NEXT_PUBLIC_CLERK_BILLING_ENABLED=true</code>
              {" "}
              to render the live pricing table here.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

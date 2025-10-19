import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const createCheckout = trpc.payment.createCheckout.useMutation();

  const handleUpgrade = async (plan: 'pro' | 'lifetime') => {
    if (!user) {
      setLocation('/');
      return;
    }

    try {
      const { url } = await createCheckout.mutateAsync({ plan });
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error('Failed to start checkout');
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        'Up to 10 episodes',
        'Auto-numbering',
        'Template editor',
        'Manual download',
      ],
      cta: 'Current Plan',
      disabled: true,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'one-time',
      popular: true,
      features: [
        'Unlimited episodes',
        'Auto-numbering',
        'Template editor',
        'Buzzsprout integration',
        'Podbean integration',
        'Guided Spotify upload',
        'Batch generation',
        'Priority support',
      ],
      cta: 'Upgrade to Pro',
      plan: 'pro' as const,
    },
    {
      name: 'Lifetime',
      price: '$99',
      period: 'one-time',
      features: [
        'Everything in Pro',
        'Lifetime access',
        'All future features',
        'Priority support',
        'Early access to new platforms',
      ],
      cta: 'Get Lifetime Access',
      plan: 'lifetime' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">
            Choose the plan that's right for your podcast
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-8 ${
                plan.popular
                  ? 'border-2 border-primary shadow-lg scale-105'
                  : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="bg-primary text-primary-foreground text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}
              
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-600 ml-2">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                disabled={plan.disabled || createCheckout.isPending}
                onClick={() => plan.plan && handleUpgrade(plan.plan)}
              >
                {createCheckout.isPending ? 'Loading...' : plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 text-gray-600">
          <p>All plans include a 30-day money-back guarantee</p>
        </div>
      </div>
    </div>
  );
}


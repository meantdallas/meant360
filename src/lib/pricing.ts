import type { PricingRules, PriceBreakdown, PriceLineItem } from '@/types';

export const DEFAULT_PRICING_RULES: PricingRules = {
  enabled: false,
  model: 'per_family',
  memberPrice: 0,
  guestPrice: 0,
  kidPrice: 0,
  kidsFreeUnderAge: 5,
  multiPersonDiscount: { enabled: false, minPeople: 3, type: 'flat', value: 0 },
  siblingDiscount: { enabled: false, minKids: 2, type: 'flat', value: 0 },
  multiEventDiscount: { enabled: false, minEvents: 2, type: 'flat', value: 0 },
};

export function parsePricingRules(json: string): PricingRules {
  if (!json) return { ...DEFAULT_PRICING_RULES };
  try {
    const parsed = JSON.parse(json);
    return { ...DEFAULT_PRICING_RULES, ...parsed };
  } catch {
    return { ...DEFAULT_PRICING_RULES };
  }
}

interface CalculatePriceInput {
  pricingRules: PricingRules;
  type: 'Member' | 'Guest';
  adults: number;
  kids: number;
  otherSubEventCount: number;
}

function applyDiscount(subtotal: number, type: 'flat' | 'percent', value: number): number {
  if (type === 'percent') {
    return subtotal * (value / 100);
  }
  return value;
}

export function calculatePrice(input: CalculatePriceInput): PriceBreakdown {
  const { pricingRules, type, adults, kids, otherSubEventCount } = input;

  if (!pricingRules.enabled || pricingRules.model === 'free') {
    return { lineItems: [], subtotal: 0, discounts: [], total: 0 };
  }

  const lineItems: PriceLineItem[] = [];
  const discounts: PriceLineItem[] = [];
  const basePrice = type === 'Member' ? pricingRules.memberPrice : pricingRules.guestPrice;

  if (pricingRules.model === 'per_family') {
    lineItems.push({ label: `${type} (Family)`, amount: basePrice });
    if (kids > 0 && pricingRules.kidPrice > 0) {
      lineItems.push({ label: `Kids (${kids})`, amount: pricingRules.kidPrice * kids });
    }
  } else if (pricingRules.model === 'per_person') {
    if (adults > 0) {
      lineItems.push({ label: `Adults (${adults})`, amount: basePrice * adults });
    }
    if (kids > 0 && pricingRules.kidPrice > 0) {
      lineItems.push({ label: `Kids (${kids})`, amount: pricingRules.kidPrice * kids });
    }
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  // Multi-person discount
  const mpd = pricingRules.multiPersonDiscount;
  if (mpd.enabled && adults + kids >= mpd.minPeople) {
    const discount = applyDiscount(subtotal, mpd.type, mpd.value);
    discounts.push({
      label: `Multi-person discount (${mpd.minPeople}+ people)`,
      amount: -discount,
    });
  }

  // Sibling discount — applied per additional kid beyond the first
  const sd = pricingRules.siblingDiscount;
  if (sd.enabled && kids >= sd.minKids) {
    const additionalKids = kids - 1;
    const perKidDiscount = applyDiscount(pricingRules.kidPrice, sd.type, sd.value);
    const discount = perKidDiscount * additionalKids;
    discounts.push({
      label: `Sibling discount (${additionalKids} extra kid${additionalKids > 1 ? 's' : ''})`,
      amount: -discount,
    });
  }

  // Multi-event discount
  const med = pricingRules.multiEventDiscount;
  if (med.enabled && otherSubEventCount + 1 >= med.minEvents) {
    const discount = applyDiscount(subtotal, med.type, med.value);
    discounts.push({
      label: `Multi-event discount (${otherSubEventCount + 1} events)`,
      amount: -discount,
    });
  }

  const totalDiscounts = discounts.reduce((sum, d) => sum + d.amount, 0);
  const total = Math.max(0, subtotal + totalDiscounts);

  return { lineItems, subtotal, discounts, total };
}

export function formatPricingSummary(rules: PricingRules): string {
  if (!rules.enabled) return 'Free';
  if (rules.model === 'free') return 'Free';
  if (rules.model === 'per_family') return `$${rules.memberPrice}/family`;
  if (rules.model === 'per_person') return `$${rules.memberPrice}/adult`;
  return '';
}

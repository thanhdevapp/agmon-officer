/**
 * AGMon — Commercial & Supporter License Verification Engine
 * Supports:
 * 1. Signed Offline License Keys: AGMON-(PRO|VIP|FOUNDER|SUPPORTER)-[8_CHAR_HASH]-[2_OR_4_CHAR_CHECKSUM]
 * 2. Merchant of Record Online Keys (Polar.sh / Lemon Squeezy UUIDs & live tokens)
 */

const LICENSE_SALT = "AGMON_OPEN_CORE_2026_V2";

export const CHECKOUT_CONFIG = Object.freeze({
  polarProMonthlyUrl:
    (typeof process !== "undefined" &&
      (process.env?.VITE_AGMON_PRO_CHECKOUT_URL ||
        process.env?.NEXT_PUBLIC_AGMON_PRO_CHECKOUT_URL)) ||
    "https://polar.sh/thanhdevapp/products/agmon-pro",
  polarProYearlyUrl:
    (typeof process !== "undefined" &&
      (process.env?.VITE_AGMON_PRO_YEARLY_CHECKOUT_URL ||
        process.env?.NEXT_PUBLIC_AGMON_PRO_YEARLY_CHECKOUT_URL)) ||
    "https://polar.sh/thanhdevapp/products/agmon-pro-yearly",
  polarFounderLifetimeUrl:
    (typeof process !== "undefined" &&
      (process.env?.VITE_AGMON_FOUNDER_CHECKOUT_URL ||
        process.env?.NEXT_PUBLIC_AGMON_FOUNDER_CHECKOUT_URL)) ||
    "https://polar.sh/thanhdevapp/products/agmon-founder-lifetime",
  polarSupporterUrl:
    (typeof process !== "undefined" &&
      (process.env?.VITE_AGMON_SUPPORTER_CHECKOUT_URL ||
        process.env?.NEXT_PUBLIC_AGMON_SUPPORTER_CHECKOUT_URL)) ||
    "https://polar.sh/thanhdevapp/products/agmon-supporter-pack",
  pro_monthly: {
    id: "pro_monthly",
    tier: "pro",
    name: "AGMon Pro Monthly",
    priceUsd: 12,
    priceVnd: 299000,
    billingPeriod: "month",
    checkoutUrl:
      (typeof process !== "undefined" &&
        (process.env?.VITE_AGMON_PRO_CHECKOUT_URL ||
          process.env?.NEXT_PUBLIC_AGMON_PRO_CHECKOUT_URL)) ||
      "https://polar.sh/thanhdevapp/products/agmon-pro",
  },
  pro_yearly: {
    id: "pro_yearly",
    tier: "pro",
    name: "AGMon Pro Annual",
    priceUsd: 99,
    priceVnd: 2450000,
    billingPeriod: "year",
    checkoutUrl:
      (typeof process !== "undefined" &&
        (process.env?.VITE_AGMON_PRO_YEARLY_CHECKOUT_URL ||
          process.env?.NEXT_PUBLIC_AGMON_PRO_YEARLY_CHECKOUT_URL)) ||
      "https://polar.sh/thanhdevapp/products/agmon-pro-yearly",
  },
  founder_lifetime: {
    id: "founder_lifetime",
    tier: "founder",
    name: "Founder Lifetime Pass",
    priceUsd: 59,
    priceVnd: 1450000,
    billingPeriod: "lifetime",
    checkoutUrl:
      (typeof process !== "undefined" &&
        (process.env?.VITE_AGMON_FOUNDER_CHECKOUT_URL ||
          process.env?.NEXT_PUBLIC_AGMON_FOUNDER_CHECKOUT_URL)) ||
      "https://polar.sh/thanhdevapp/products/agmon-founder-lifetime",
  },
  supporter_vip: {
    id: "supporter_vip",
    tier: "vip",
    name: "Supporter Cosmetics Vault",
    priceUsd: 19,
    priceVnd: 450000,
    billingPeriod: "lifetime",
    checkoutUrl:
      (typeof process !== "undefined" &&
        (process.env?.VITE_AGMON_SUPPORTER_CHECKOUT_URL ||
          process.env?.NEXT_PUBLIC_AGMON_SUPPORTER_CHECKOUT_URL)) ||
      "https://polar.sh/thanhdevapp/products/agmon-supporter-pack",
  },
});

export const LEGACY_VERIFIED_CODES = Object.freeze({
  "AGMON-DEV-FOUNDER-2026": {
    tier: "founder",
    planId: "founder_lifetime",
    label: "Master Founder Edition",
  },
  "AGMON-COFFEE-VIP": {
    tier: "vip",
    planId: "supporter_vip",
    label: "VIP Supporter Edition",
  },
  "AGMON-DEV-VIP": {
    tier: "vip",
    planId: "supporter_vip",
    label: "Developer VIP Edition",
  },
  "SUPPORTER-2026": {
    tier: "vip",
    planId: "supporter_vip",
    label: "Supporter 2026 Edition",
  },
  "DEV-BUFF-NIGHT": {
    tier: "vip",
    planId: "supporter_vip",
    label: "Night Shift Supporter Edition",
  },
  "VIETQR-VIP": {
    tier: "vip",
    planId: "supporter_vip",
    label: "VietQR Supporter Edition",
  },
});

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

export function computeLicenseChecksum(tier, payload, length = 4) {
  const salted = simpleHash(`${LICENSE_SALT}:${tier}:${payload}`).padStart(4, "0");
  return salted.slice(0, length);
}

/**
 * Checks if a key matches a Polar.sh / Lemon Squeezy UUID or prefixed live key format.
 */
export function isMerchantLicenseFormat(rawKey = "") {
  if (!rawKey || typeof rawKey !== "string") return false;
  const trimmed = rawKey.trim();
  // Standard UUID v4 format from Lemon Squeezy / Polar.sh
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }
  // Prefixed Polar / AGMon merchant key format
  if (/^(polar_lk_|agmon_live_|lsq_lk_)[a-zA-Z0-9_-]{12,}$/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Validates whether a license key is authentic and returns tier metadata.
 * Rejects arbitrary spoofed suffixes like "FAKE-VIP" or "HACK-SUPPORTER".
 */
export function verifyLicenseKey(key = "") {
  if (!key || typeof key !== "string") return { valid: false };
  const clean = key.trim().toUpperCase();

  if (clean in LEGACY_VERIFIED_CODES) {
    const entry = LEGACY_VERIFIED_CODES[clean];
    return {
      valid: true,
      tier: entry.tier,
      planId: entry.planId,
      label: entry.label,
      provider: "offline",
    };
  }

  // Pattern: AGMON-(PRO|VIP|FOUNDER|SUPPORTER)-[HEX8]-[HEX2..4]
  const match = clean.match(/^AGMON-(PRO|VIP|FOUNDER|SUPPORTER)-([A-F0-9]{8})-([A-F0-9]{2,4})$/);
  if (!match) {
    return { valid: false };
  }

  const [_, rawTier, payload, checksum] = match;
  const legacyCheck2 = simpleHash(`${rawTier}:${payload}`).slice(0, 2);
  const saltedCheck4 = computeLicenseChecksum(rawTier, payload, 4);

  if (checksum !== legacyCheck2 && checksum !== saltedCheck4) {
    return { valid: false };
  }

  const normalizedTier =
    rawTier === "SUPPORTER" ? "vip" : rawTier.toLowerCase();
  const planId =
    normalizedTier === "founder"
      ? "founder_lifetime"
      : normalizedTier === "pro"
      ? "pro_monthly"
      : "supporter_vip";

  return {
    valid: true,
    tier: normalizedTier,
    planId,
    label: `${rawTier} Edition License`,
    provider: "offline",
  };
}

/**
 * Generates a valid signed license key for a given tier and seed.
 */
export function generateLicenseKey(tier = "PRO", seed = "DEV", useSalted4 = false) {
  const normalizedTier = String(tier || "PRO").trim().toUpperCase();
  const payload = simpleHash(`${normalizedTier}:${seed}:${Date.now()}`)
    .padStart(8, "0")
    .slice(0, 8);
  const checksum = useSalted4
    ? computeLicenseChecksum(normalizedTier, payload, 4)
    : simpleHash(`${normalizedTier}:${payload}`).slice(0, 2);
  return `AGMON-${normalizedTier}-${payload}-${checksum}`;
}

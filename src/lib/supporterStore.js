/**
 * Supporter Store & Cosmetic Customization Engine
 * Manages supporter status, item inventory (1,000 Skins, Props, Pets, Auras, Trophies), and Ambient soundscapes.
 * Persists in localStorage and broadcasts sync events to PixiJS Canvas.
 */

import { COSMETIC_CATALOG } from "./catalog/index.js";
import {
  verifyLicenseKey,
  isMerchantLicenseFormat,
  CHECKOUT_CONFIG,
} from "./cosmetics/licenseKey.js";
import walletStore from "./progression/walletStore.js";

export { COSMETIC_CATALOG, CHECKOUT_CONFIG };
export const SUPPORTER_STORAGE_KEY = "agmon_supporter_data";
export const SUPPORTER_CHANGE_EVENT = "agmon:supporter-change";

// Collect all free items by default
const FREE_SKIN_IDS = COSMETIC_CATALOG.skins.filter((s) => s.tier === "free").map((s) => s.id);
const FREE_PET_IDS = COSMETIC_CATALOG.pets.filter((p) => p.tier === "free").map((p) => p.id);
const FREE_PROP_IDS = COSMETIC_CATALOG.props.filter((pr) => pr.tier === "free").map((pr) => pr.id);
const FREE_AURA_IDS = (COSMETIC_CATALOG.auras || []).filter((a) => a.tier === "free").map((a) => a.id);
const FREE_TROPHY_IDS = (COSMETIC_CATALOG.trophies || []).filter((t) => t.tier === "free").map((t) => t.id);
const FREE_THEME_IDS = (COSMETIC_CATALOG.officeThemes || []).filter((th) => th.tier === "free").map((th) => th.id);

const DEFAULT_STATE = {
  isSupporter: false,
  supporterTier: "none", // 'none' | 'vip' | 'pro' | 'founder'
  planId: "community", // 'community' | 'supporter_vip' | 'pro_monthly' | 'pro_yearly' | 'founder_lifetime'
  licenseKey: null,
  licenseProvider: null, // 'polar' | 'lemonsqueezy' | 'offline' | null
  activatedAt: null,
  equippedSkin: "skin_0",
  equippedPet: "pet_0",
  equippedProps: [],
  equippedAura: "none",
  equippedTrophy: "none",
  equippedOfficeTheme: "theme_default",
  ambientSound: "none",
  ambientVolume: 0.35,
  unlockedItems: Array.from(
    new Set([
      "skin_0",
      "pet_0",
      "prop_0",
      "aura_0",
      "trophy_0",
      "theme_default",
      "classic",
      "none",
      ...FREE_SKIN_IDS,
      ...FREE_PET_IDS,
      ...FREE_PROP_IDS,
      ...FREE_AURA_IDS,
      ...FREE_TROPHY_IDS,
      ...FREE_THEME_IDS,
    ])
  ),
};

function getAllCatalogItemIds() {
  return [
    ...COSMETIC_CATALOG.skins.map((s) => s.id),
    ...COSMETIC_CATALOG.pets.map((p) => p.id),
    ...COSMETIC_CATALOG.props.map((pr) => pr.id),
    ...(COSMETIC_CATALOG.auras || []).map((a) => a.id),
    ...(COSMETIC_CATALOG.trophies || []).map((t) => t.id),
    ...(COSMETIC_CATALOG.officeThemes || []).map((th) => th.id),
  ];
}

// Normalize legacy IDs (e.g. classic -> skin_0, none -> pet_0)
function normalizeState(state) {
  if (!state) return DEFAULT_STATE;
  const s = { ...DEFAULT_STATE, ...state };
  if (s.equippedSkin === "classic" || !s.equippedSkin) s.equippedSkin = "skin_0";
  if (s.equippedPet === "none" || !s.equippedPet) s.equippedPet = "pet_0";
  if (!s.equippedAura) s.equippedAura = "none";
  if (!s.equippedTrophy) s.equippedTrophy = "none";
  if (!s.equippedOfficeTheme) s.equippedOfficeTheme = "theme_default";
  if (!Array.isArray(s.unlockedItems)) s.unlockedItems = DEFAULT_STATE.unlockedItems;
  if (!s.planId) {
    s.planId =
      s.supporterTier === "founder"
        ? "founder_lifetime"
        : s.supporterTier === "pro"
        ? "pro_monthly"
        : s.isSupporter
        ? "supporter_vip"
        : "community";
  }
  return s;
}

// Read state from localStorage
export function getSupporterState() {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const storage = window.localStorage;
    const raw = storage?.getItem(SUPPORTER_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return DEFAULT_STATE;
  }
}

/**
 * Returns true if the user has unlocked AGMon Pro, Founder Lifetime, or VIP Supporter access.
 */
export function hasProAccess(state = getSupporterState()) {
  if (!state) return false;
  return (
    state.isSupporter === true ||
    ["pro", "founder", "vip"].includes(String(state.supporterTier || "").toLowerCase())
  );
}

// Save state and dispatch change event
function saveAndNotify(nextState) {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    storage?.setItem(SUPPORTER_STORAGE_KEY, JSON.stringify(nextState));
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent(SUPPORTER_CHANGE_EVENT, { detail: nextState }));
    }
  } catch {
    // Opaque-origin sandboxed iframes block localStorage by design.
  }
}

// Cross-tab and window focus synchronization
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (e) => {
    if (e.key === SUPPORTER_STORAGE_KEY) {
      try {
        const next = e.newValue ? JSON.parse(e.newValue) : DEFAULT_STATE;
        window.dispatchEvent(new CustomEvent(SUPPORTER_CHANGE_EVENT, { detail: next }));
      } catch (err) {}
    }
  });

  window.addEventListener("focus", () => {
    const current = getSupporterState();
    window.dispatchEvent(new CustomEvent(SUPPORTER_CHANGE_EVENT, { detail: current }));
  });
}

function applyVerifiedUnlock({
  tier = "vip",
  planId = "supporter_vip",
  label = "VIP Supporter Edition",
  licenseKey = null,
  provider = "offline",
} = {}) {
  const current = getSupporterState();
  const allUnlocked = Array.from(
    new Set([...current.unlockedItems, ...getAllCatalogItemIds()])
  );

  const nextState = {
    ...current,
    isSupporter: true,
    supporterTier: tier,
    planId,
    licenseKey: licenseKey || current.licenseKey,
    licenseProvider: provider || current.licenseProvider || "offline",
    activatedAt: new Date().toISOString(),
    unlockedItems: allUnlocked,
    equippedSkin:
      current.equippedSkin === "classic" || !current.equippedSkin ? "skin_0" : current.equippedSkin,
    equippedPet:
      current.equippedPet === "none" || !current.equippedPet ? "pet_0" : current.equippedPet,
    equippedProps: Array.from(new Set([...current.equippedProps, "prop_0", "prop_1"])),
  };

  saveAndNotify(nextState);
  return {
    success: true,
    tier,
    planId,
    provider,
    message: `Congratulations! Activated ${label} — all 1,000+ items and Pro features unlocked.`,
    state: nextState,
  };
}

// Unlock via code (Strict Cryptographic / Verified License Check — no arbitrary -VIP suffix spoofing)
export function unlockWithCode(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return { success: false, message: "Please enter an activation code." };

  const verified = verifyLicenseKey(c);
  if (verified.valid) {
    return applyVerifiedUnlock({
      tier: verified.tier || "vip",
      planId: verified.planId || "supporter_vip",
      label: verified.label || "Supporter Edition",
      licenseKey: c,
      provider: verified.provider || "offline",
    });
  }

  return { success: false, message: "Invalid activation code. Please check and try again." };
}

// Activate Supporter Status via Offline License Key (e.g. from Polar.sh / Lemon Squeezy / VietQR)
export function activateSupporterLicense(licenseKey) {
  const check = verifyLicenseKey(licenseKey);
  if (!check.valid) {
    return { success: false, message: "Invalid license key format or signature." };
  }

  return applyVerifiedUnlock({
    tier: check.tier || "vip",
    planId: check.planId || "supporter_vip",
    label: check.label || "Supporter Edition",
    licenseKey: String(licenseKey || "").trim().toUpperCase(),
    provider: check.provider || "offline",
  });
}

/**
 * Online + Offline License Activation (Polar.sh / Lemon Squeezy / Signed Key)
 * Calls POST /api/license/verify and falls back to local cryptographic verification if offline.
 */
export async function activateLicenseOnline(rawKey, instanceName = "AGMon-Desktop") {
  const clean = String(rawKey || "").trim();
  if (!clean) {
    return { success: false, message: "Please enter a valid license key." };
  }

  // Try server verification first (handles Polar.sh / Lemon Squeezy + persists ~/.agmon/license.json)
  if (typeof fetch === "function") {
    try {
      const response = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: clean, instanceName }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.valid) {
          return applyVerifiedUnlock({
            tier: data.tier || "pro",
            planId: data.planId || "pro_monthly",
            label: data.label || "AGMon Pro License",
            licenseKey: clean,
            provider: data.provider || "polar",
          });
        }
        if (data && data.valid === false && !isMerchantLicenseFormat(clean)) {
          return {
            success: false,
            message: data.error || "Invalid license key. Please check and try again.",
          };
        }
      }
    } catch {
      // Offline or standalone test environment — fall through to local verification
    }
  }

  return unlockWithCode(clean);
}

// Equip Skin
export function equipSkin(skinId) {
  const current = getSupporterState();
  const isFree = COSMETIC_CATALOG.skins.find((s) => s.id === skinId)?.tier === "free";
  if (!current.unlockedItems.includes(skinId) && !current.isSupporter && !isFree && skinId !== "skin_0") {
    return false;
  }
  const next = { ...current, equippedSkin: skinId };
  saveAndNotify(next);
  return true;
}

// Equip Pet
export function equipPet(petId) {
  const current = getSupporterState();
  const isFree = COSMETIC_CATALOG.pets.find((p) => p.id === petId)?.tier === "free";
  if (!current.unlockedItems.includes(petId) && !current.isSupporter && !isFree && petId !== "pet_0") {
    return false;
  }
  const next = { ...current, equippedPet: petId };
  saveAndNotify(next);
  return true;
}

// Toggle Desk Prop
export function toggleProp(propId) {
  const current = getSupporterState();
  const isFree = COSMETIC_CATALOG.props.find((p) => p.id === propId)?.tier === "free";
  if (!current.unlockedItems.includes(propId) && !current.isSupporter && !isFree) {
    return false;
  }
  const props = new Set(current.equippedProps);
  if (props.has(propId)) {
    props.delete(propId);
  } else {
    props.add(propId);
  }
  const next = { ...current, equippedProps: Array.from(props) };
  saveAndNotify(next);
  return true;
}

// Equip Aura
export function equipAura(auraId) {
  const current = getSupporterState();
  const isFree = (COSMETIC_CATALOG.auras || []).find((a) => a.id === auraId)?.tier === "free";
  if (!current.unlockedItems.includes(auraId) && !current.isSupporter && !isFree && auraId !== "none" && auraId !== "aura_0") {
    return false;
  }
  const next = { ...current, equippedAura: auraId };
  saveAndNotify(next);
  return true;
}

// Equip Trophy
export function equipTrophy(trophyId) {
  const current = getSupporterState();
  const isFree = (COSMETIC_CATALOG.trophies || []).find((t) => t.id === trophyId)?.tier === "free";
  if (!current.unlockedItems.includes(trophyId) && !current.isSupporter && !isFree && trophyId !== "none" && trophyId !== "trophy_0") {
    return false;
  }
  const next = { ...current, equippedTrophy: trophyId };
  saveAndNotify(next);
  return true;
}

// Equip Office Theme / Floor Environment
export function equipOfficeTheme(themeId) {
  const current = getSupporterState();
  const isFree = (COSMETIC_CATALOG.officeThemes || []).find((t) => t.id === themeId)?.tier === "free";
  if (!current.unlockedItems.includes(themeId) && !current.isSupporter && !isFree && themeId !== "theme_default") {
    return false;
  }
  const next = { ...current, equippedOfficeTheme: themeId };
  saveAndNotify(next);
  return true;
}

// Unlock an item using $COIN mined from real work
export function unlockWithCoins(itemId, coinCost = 500) {
  const current = getSupporterState();
  if (current.unlockedItems.includes(itemId)) {
    return { success: true, message: "Item is already unlocked!" };
  }
  const didSpend = walletStore.spendCoins(coinCost);
  if (!didSpend) {
    return {
      success: false,
      message: `Insufficient $COIN balance! You need ${coinCost.toLocaleString()} $COIN.`,
    };
  }
  const next = {
    ...current,
    unlockedItems: Array.from(new Set([...current.unlockedItems, itemId])),
  };
  saveAndNotify(next);
  return { success: true, message: "Item successfully unlocked with $COIN!" };
}

// Update Ambient Soundscape
export function setAmbientSound(soundId, volume = null) {
  const current = getSupporterState();
  const next = {
    ...current,
    ambientSound: soundId,
    ambientVolume: volume !== null ? volume : current.ambientVolume,
  };
  saveAndNotify(next);
  return next;
}

// Equip a full custom loadout (Skin, Pet, Props, Aura, Office Theme) at once
export function equipCustomLoadout(loadout = {}) {
  const current = getSupporterState();
  const next = {
    ...current,
    ...(loadout.equippedSkin ? { equippedSkin: loadout.equippedSkin } : {}),
    ...(loadout.equippedPet ? { equippedPet: loadout.equippedPet } : {}),
    ...(Array.isArray(loadout.equippedProps) ? { equippedProps: loadout.equippedProps } : {}),
    ...(loadout.equippedAura ? { equippedAura: loadout.equippedAura } : {}),
    ...(loadout.equippedOfficeTheme ? { equippedOfficeTheme: loadout.equippedOfficeTheme } : {}),
    ...(loadout.equippedTrophy ? { equippedTrophy: loadout.equippedTrophy } : {}),
  };
  saveAndNotify(next);
  return next;
}

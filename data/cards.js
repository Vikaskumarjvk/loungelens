/*
 * LoungeLens — credit card lounge-benefit dataset (India), reviewed 2026-06-21.
 *
 * SCOPE: this lists cards that CARRY lounge access (the only ones relevant to a
 * lounge app) across all major Indian issuers, plus a few common no-lounge cards
 * flagged as baseline. India has 500+ card variants; the vast majority have no
 * lounge benefit and are intentionally omitted. This is the lounge-relevant set.
 *
 * PROVENANCE (be honest): a live scrape of the aggregator sites was attempted and
 * BLOCKED (403/bot-protection on Paisabazaar/BankBazaar; DreamFolks confirmed only
 * the issuer list). So these entries are compiled from working knowledge of the
 * 2024-25 lounge overhaul, NOT live-scraped. Every entry is confidence-tagged and
 * carries a `verify` pointer. The app ages confidence over time. DESK-CHECK any
 * specific number against the issuer's T&C before relying on it.
 *
 * THE 2024-25 TRAP: most issuers moved to SPEND-GATED visits (next quarter's free
 * visits unlock only if you spent >= a threshold this quarter). Modeled in `spendGate`.
 *
 * FIELDS: see schema notes in README. domesticVisits = number|"unlimited"|0;
 * period = quarter|year|month; spendGate = null | {amount, per, note};
 * programs = access rails; ease 1..5; approvalSpeed instant|fast|normal|slow.
 */
window.LL_CARDS = [
  // ==================================================================
  // RUPAY / NETWORK LOUNGE PROGRAMS (easiest, broadest)
  // ==================================================================
  { id: "rupay-select", name: "RuPay Select (any bank)", issuer: "Various", network: "rupay",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["rupay", "dreamfolks"], railway: true,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "fast",
    eligibility: "Easiest lounge route; many banks issue on modest income, sometimes near-instant to existing customers.",
    feeNote: "Varies (often ₹0-₹999). RuPay Select tier: ~2 domestic/quarter + railway. Works on UPI.",
    confidence: "med", verify: "rupay.co.in lounge program + issuing bank T&C" },
  { id: "rupay-platinum", name: "RuPay Platinum (any bank)", issuer: "Various", network: "rupay",
    domesticVisits: 2, period: "year", spendGate: null, programs: ["rupay", "dreamfolks"], railway: true,
    ease: 5, ltf: true, fyf: true, approvalSpeed: "fast",
    eligibility: "Very easy; common on basic bank cards.",
    feeNote: "Often free. Lower lounge allowance than Select.",
    confidence: "low", verify: "rupay.co.in + issuing bank T&C" },

  // ==================================================================
  // HDFC BANK
  // ==================================================================
  { id: "hdfc-millennia", name: "HDFC Millennia", issuer: "HDFC", network: "mastercard",
    domesticVisits: 1, period: "quarter", spendGate: { amount: 100000, per: "quarter", note: "1 lounge/quarter only if ₹1L spent the PRIOR quarter." },
    programs: ["dreamfolks", "mastercard"], railway: false, ease: 4, ltf: false, fyf: true, approvalSpeed: "normal",
    eligibility: "HDFC favours existing customers / salaried.", feeNote: "₹1000, waivable on ₹1L/yr.",
    confidence: "med", verify: "hdfcbank.com" },
  { id: "hdfc-moneyback-plus", name: "HDFC MoneyBack+", issuer: "HDFC", network: "visa",
    domesticVisits: 0, period: "quarter", spendGate: null, programs: [], railway: false, ease: 4, ltf: false, fyf: true, approvalSpeed: "normal",
    eligibility: "Entry card.", feeNote: "₹500. No lounge — baseline.", confidence: "low", verify: "hdfcbank.com" },
  { id: "hdfc-regalia", name: "HDFC Regalia Gold", issuer: "HDFC", network: "visa",
    domesticVisits: 12, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Mid-high income; common HDFC upgrade.",
    feeNote: "₹2500, waivable. 12 domestic/yr + Priority Pass.", confidence: "med", verify: "hdfcbank.com" },
  { id: "hdfc-regalia-first", name: "HDFC Regalia First", issuer: "HDFC", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Mid income.", feeNote: "₹1000, waivable.",
    confidence: "low", verify: "hdfcbank.com" },
  { id: "hdfc-diners-privilege", name: "HDFC Diners Club Privilege", issuer: "HDFC", network: "diners",
    domesticVisits: 12, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "diners"], railway: false,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Mid-high income.",
    feeNote: "₹2500, waivable. Domestic + Priority Pass.", confidence: "low", verify: "hdfcbank.com" },
  { id: "hdfc-diners-black", name: "HDFC Diners Club Black", issuer: "HDFC", network: "diners",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "diners"], railway: true,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "High income (~₹18L+ commonly cited).",
    feeNote: "₹10,000. Unlimited domestic + Priority Pass.", confidence: "med", verify: "hdfcbank.com" },
  { id: "hdfc-infinia", name: "HDFC Infinia", issuer: "HDFC", network: "visa",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa", "diners"], railway: true,
    ease: 1, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Invite / HNW. Not gettable in under a month for most.",
    feeNote: "₹12,500. Unlimited domestic + Priority Pass (self+guest).", confidence: "high", verify: "hdfcbank.com" },
  { id: "hdfc-tata-neu-infinity", name: "Tata Neu Infinity HDFC", issuer: "HDFC", network: "rupay",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "rupay", "visa"], railway: true,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Mid income; RuPay variant works on UPI.",
    feeNote: "₹1499, waivable. Domestic lounge + railway.", confidence: "low", verify: "hdfcbank.com" },
  { id: "hdfc-marriott", name: "Marriott Bonvoy HDFC", issuer: "HDFC", network: "diners",
    domesticVisits: 12, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "diners"], railway: false,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Mid-high income, travel card.",
    feeNote: "₹3000. Priority Pass + domestic.", confidence: "low", verify: "hdfcbank.com" },

  // ==================================================================
  // AXIS BANK
  // ==================================================================
  { id: "axis-myzone", name: "Axis MyZone", issuer: "Axis", network: "mastercard",
    domesticVisits: 1, period: "quarter", spendGate: null, programs: ["dreamfolks", "mastercard"], railway: false,
    ease: 5, ltf: false, fyf: true, approvalSpeed: "fast", eligibility: "Popular entry card, quick approval for salaried.",
    feeNote: "₹500. 1 domestic lounge/quarter.", confidence: "med", verify: "axisbank.com" },
  { id: "axis-ace", name: "Axis ACE", issuer: "Axis", network: "visa",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 4, ltf: false, fyf: false, approvalSpeed: "fast", eligibility: "Mid income salaried.",
    feeNote: "₹499, waivable. 4 domestic/yr.", confidence: "med", verify: "axisbank.com" },
  { id: "axis-atlas", name: "Axis Atlas", issuer: "Axis", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Travel card; mid-high income.",
    feeNote: "₹5000. Domestic + international lounge on milestones.", confidence: "med", verify: "axisbank.com" },
  { id: "axis-magnus", name: "Axis Magnus / Burgundy", issuer: "Axis", network: "mastercard",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "mastercard"], railway: true,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "High income / Burgundy banking relationship.",
    feeNote: "₹12,500. Unlimited domestic + Priority Pass guest visits.", confidence: "med", verify: "axisbank.com" },
  { id: "axis-reserve", name: "Axis Reserve", issuer: "Axis", network: "mastercard",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "mastercard"], railway: true,
    ease: 1, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Super-premium, invite/HNW.",
    feeNote: "₹50,000. Unlimited domestic + Priority Pass.", confidence: "low", verify: "axisbank.com" },
  { id: "axis-vistara", name: "Axis Vistara (legacy)", issuer: "Axis", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Co-brand; note Vistara merged into Air India — verify status.",
    feeNote: "Varies. Verify post Air India-Vistara merger.", confidence: "low", verify: "axisbank.com (Vistara merger affects this)" },
  { id: "axis-flipkart", name: "Flipkart Axis", issuer: "Axis", network: "mastercard",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "fast", eligibility: "Popular cashback card.",
    feeNote: "₹500. No lounge on base variant — baseline.", confidence: "low", verify: "axisbank.com" },

  // ==================================================================
  // ICICI BANK
  // ==================================================================
  { id: "amazon-icici", name: "Amazon Pay ICICI", issuer: "ICICI", network: "visa",
    domesticVisits: 0, period: "quarter", spendGate: null, programs: [], railway: false, ease: 5, ltf: true, fyf: true, approvalSpeed: "fast",
    eligibility: "Very widely held, lifetime-free.", feeNote: "Lifetime free. No lounge — listed so you know it won't help at the gate.",
    confidence: "high", verify: "icici.com" },
  { id: "icici-coral", name: "ICICI Coral", issuer: "ICICI", network: "visa",
    domesticVisits: 1, period: "quarter", spendGate: { amount: 75000, per: "quarter", note: "Newer variants tie lounge access to quarterly spend." },
    programs: ["dreamfolks", "visa"], railway: true, ease: 4, ltf: false, fyf: false, approvalSpeed: "normal",
    eligibility: "Mid income; faster for existing ICICI customers.", feeNote: "₹500+. 1 domestic/quarter (spend-gated) + railway.",
    confidence: "low", verify: "icici.com (variant + spend rule volatile)" },
  { id: "icici-rubyx", name: "ICICI Rubyx", issuer: "ICICI", network: "visa",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "visa", "mastercard"], railway: true,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Mid income.",
    feeNote: "₹3000, waivable. Dual network, domestic + railway.", confidence: "low", verify: "icici.com" },
  { id: "icici-sapphiro", name: "ICICI Sapphiro", issuer: "ICICI", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: true,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Mid-high income.",
    feeNote: "₹3500, waivable. Domestic + Priority Pass + railway.", confidence: "low", verify: "icici.com" },
  { id: "icici-emeralde", name: "ICICI Emeralde Private Metal", issuer: "ICICI", network: "visa",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: true,
    ease: 1, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Super-premium, HNW.",
    feeNote: "₹12,499. Unlimited domestic + Priority Pass.", confidence: "low", verify: "icici.com" },
  { id: "icici-amazon-no2", name: "ICICI HPCL / co-brands", issuer: "ICICI", network: "visa",
    domesticVisits: 1, period: "quarter", spendGate: { amount: 50000, per: "quarter", note: "Co-brand lounge often spend-gated." },
    programs: ["dreamfolks", "visa"], railway: false, ease: 4, ltf: false, fyf: true, approvalSpeed: "normal",
    eligibility: "Fuel co-brand.", feeNote: "Low fee. Spend-gated lounge.", confidence: "low", verify: "icici.com" },

  // ==================================================================
  // SBI CARD
  // ==================================================================
  { id: "sbi-cashback", name: "SBI Cashback", issuer: "SBI", network: "visa",
    domesticVisits: 0, period: "quarter", spendGate: null, programs: [], railway: false, ease: 4, ltf: false, fyf: true, approvalSpeed: "normal",
    eligibility: "Common cashback card.", feeNote: "₹999, waived on ₹2L/yr. No lounge — baseline.", confidence: "high", verify: "sbicard.com" },
  { id: "sbi-simplyclick", name: "SBI SimplyCLICK", issuer: "SBI", network: "visa",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 5, ltf: false, fyf: true, approvalSpeed: "normal",
    eligibility: "Entry online-spend card.", feeNote: "₹499. No lounge — baseline.", confidence: "low", verify: "sbicard.com" },
  { id: "sbi-prime", name: "SBI Prime", issuer: "SBI", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "visa", "mastercard"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Mid income.",
    feeNote: "₹2999, waivable. 8 domestic/yr (2/quarter).", confidence: "med", verify: "sbicard.com" },
  { id: "sbi-elite", name: "SBI Elite", issuer: "SBI", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa", "mastercard"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Mid-high income.",
    feeNote: "₹4999, waivable. Domestic + Priority Pass.", confidence: "med", verify: "sbicard.com" },
  { id: "sbi-aurum", name: "SBI Aurum", issuer: "SBI", network: "visa",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa", "mastercard"], railway: false,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Premium, invite-led.",
    feeNote: "₹9999. Unlimited domestic + Priority Pass.", confidence: "low", verify: "sbicard.com" },
  { id: "sbi-pulse", name: "SBI Pulse", issuer: "SBI", network: "mastercard",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "mastercard"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Lifestyle/fitness co-brand.",
    feeNote: "₹1499. Domestic lounge.", confidence: "low", verify: "sbicard.com" },

  // ==================================================================
  // IDFC FIRST BANK
  // ==================================================================
  { id: "idfc-first-select", name: "IDFC FIRST Select", issuer: "IDFC FIRST", network: "visa",
    domesticVisits: 4, period: "quarter", spendGate: { amount: 20000, per: "month", note: "Lounge unlocks with ~₹20k monthly spend on most FIRST variants." },
    programs: ["dreamfolks", "visa"], railway: true, ease: 4, ltf: true, fyf: true, approvalSpeed: "fast",
    eligibility: "Decent income for Select.", feeNote: "Lifetime-free variants exist. Strong easy-entry pick.",
    confidence: "med", verify: "idfcfirstbank.com (spend condition varies by variant)" },
  { id: "idfc-first-wow", name: "IDFC FIRST WOW", issuer: "IDFC FIRST", network: "visa",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 5, ltf: true, fyf: true, approvalSpeed: "fast",
    eligibility: "FD-backed, approved even with thin credit.", feeNote: "Lifetime free, FD-backed. No lounge on base — baseline easy card.",
    confidence: "low", verify: "idfcfirstbank.com" },
  { id: "idfc-first-wealth", name: "IDFC FIRST Wealth", issuer: "IDFC FIRST", network: "visa",
    domesticVisits: 4, period: "quarter", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: true,
    ease: 3, ltf: true, fyf: true, approvalSpeed: "normal", eligibility: "Wealth banking relationship.",
    feeNote: "Lifetime free with relationship. Domestic + Priority Pass + railway.", confidence: "low", verify: "idfcfirstbank.com" },

  // ==================================================================
  // KOTAK MAHINDRA
  // ==================================================================
  { id: "kotak-league", name: "Kotak League Platinum", issuer: "Kotak", network: "visa",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "fast", eligibility: "Mid income; faster for Kotak account holders.",
    feeNote: "₹500-₹999, waivable. ~2 domestic/quarter.", confidence: "low", verify: "kotak.com" },
  { id: "kotak-myntra", name: "Myntra Kotak", issuer: "Kotak", network: "mastercard",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "mastercard"], railway: false,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "fast", eligibility: "Shopping co-brand.",
    feeNote: "₹500. Domestic lounge.", confidence: "low", verify: "kotak.com" },
  { id: "kotak-white", name: "Kotak White Reserve", issuer: "Kotak", network: "visa",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Premium, relationship-led.",
    feeNote: "Premium. Domestic + Priority Pass.", confidence: "low", verify: "kotak.com" },

  // ==================================================================
  // AU SMALL FINANCE BANK
  // ==================================================================
  { id: "au-altura-plus", name: "AU Altura Plus", issuer: "AU Small Finance", network: "visa",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: true,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "fast", eligibility: "AU approves relatively easily.",
    feeNote: "Low fee, waivable. Domestic + some railway.", confidence: "low", verify: "aubank.in" },
  { id: "au-zenith", name: "AU Zenith / Zenith+", issuer: "AU Small Finance", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: true,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Mid-high income.",
    feeNote: "Domestic + Priority Pass + railway.", confidence: "low", verify: "aubank.in" },

  // ==================================================================
  // INDUSIND BANK
  // ==================================================================
  { id: "indusind-legend", name: "IndusInd Legend", issuer: "IndusInd", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: true, fyf: false, approvalSpeed: "normal", eligibility: "Mid-high income; some LTF variants.",
    feeNote: "Often lifetime-free via relationship. Domestic + Priority Pass.", confidence: "low", verify: "indusind.com" },
  { id: "indusind-pinnacle", name: "IndusInd Pinnacle", issuer: "IndusInd", network: "mastercard",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "mastercard"], railway: false,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Premium.",
    feeNote: "Premium. Domestic + Priority Pass.", confidence: "low", verify: "indusind.com" },

  // ==================================================================
  // RBL BANK
  // ==================================================================
  { id: "rbl-icon", name: "RBL World Safari / Icon", issuer: "RBL", network: "mastercard",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "mastercard"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Travel card.",
    feeNote: "Domestic + Priority Pass, zero forex on Safari.", confidence: "low", verify: "rblbank.com" },

  // ==================================================================
  // YES BANK
  // ==================================================================
  { id: "yes-marquee", name: "YES Bank Marquee", issuer: "YES Bank", network: "visa",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: true,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Premium.",
    feeNote: "Unlimited domestic + Priority Pass + railway.", confidence: "low", verify: "yesbank.in" },
  { id: "yes-prosperity", name: "YES Prosperity Edge", issuer: "YES Bank", network: "mastercard",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "mastercard"], railway: false,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Mid income.",
    feeNote: "Mid card. Domestic lounge.", confidence: "low", verify: "yesbank.in" },

  // ==================================================================
  // AMERICAN EXPRESS
  // ==================================================================
  { id: "amex-plat-travel", name: "Amex Platinum Travel", issuer: "Amex", network: "amex",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Amex underwriting can be slow; income proof needed. Not ideal in weeks.",
    feeNote: "₹5000. 8 domestic visits/yr.", confidence: "med", verify: "americanexpress.com/in" },
  { id: "amex-mrcc", name: "Amex Membership Rewards (MRCC)", issuer: "Amex", network: "amex",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 3, ltf: false, fyf: true, approvalSpeed: "slow",
    eligibility: "Entry Amex.", feeNote: "₹1500. No lounge — baseline.", confidence: "low", verify: "americanexpress.com/in" },
  { id: "amex-platinum", name: "Amex Platinum Charge", issuer: "Amex", network: "amex",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority"], railway: false,
    ease: 1, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Super-premium charge card, HNW.",
    feeNote: "₹66,000. Unlimited lounge + Priority Pass + Centurion network.", confidence: "low", verify: "americanexpress.com/in" },

  // ==================================================================
  // STANDARD CHARTERED / HSBC / OTHER FOREIGN
  // ==================================================================
  { id: "sc-ultimate", name: "Standard Chartered Ultimate", issuer: "Standard Chartered", network: "visa",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Premium.",
    feeNote: "₹5000. Domestic + Priority Pass.", confidence: "low", verify: "sc.com/in" },
  { id: "hsbc-premier", name: "HSBC Premier", issuer: "HSBC", network: "mastercard",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "mastercard"], railway: false,
    ease: 2, ltf: true, fyf: false, approvalSpeed: "slow", eligibility: "HSBC Premier banking relationship.",
    feeNote: "Lifetime-free with Premier relationship. Domestic + Priority Pass.", confidence: "low", verify: "hsbc.co.in" },

  // ==================================================================
  // PSU / OTHER BANKS (RuPay-heavy)
  // ==================================================================
  { id: "bob-eterna", name: "Bank of Baroda Eterna", issuer: "Bank of Baroda", network: "visa",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "visa"], railway: true,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Mid income.",
    feeNote: "₹2499, waivable. Domestic + railway.", confidence: "low", verify: "bobcard.co.in" },
  { id: "federal-celesta", name: "Federal Bank Celesta", issuer: "Federal Bank", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Mid-high income.",
    feeNote: "Domestic + Priority Pass.", confidence: "low", verify: "federalbank.co.in" },
  { id: "idbi-aspire", name: "IDBI / Union RuPay lounge cards", issuer: "Various PSU", network: "rupay",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["rupay", "dreamfolks"], railway: true,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "PSU bank customers.",
    feeNote: "RuPay tiered lounge + railway.", confidence: "low", verify: "issuing PSU bank T&C" },

  // ==================================================================
  // ========================  DEBIT CARDS  ===========================
  // ==================================================================
  // HONESTY: banks CUT debit-card lounge access hard across 2024-25. Most now
  // need a prior-period spend (e.g. ₹25k-₹75k/quarter) or charge per visit, and
  // some removed it entirely. So most debit entries are confidence "low" with a
  // loud verify note. Debit cards are EASIEST to get (you just need the bank
  // account) so ease=5 / approvalSpeed instant-fast. type:"debit".

  { id: "rupay-select-debit", name: "RuPay Select Debit (any bank)", issuer: "Various", network: "rupay", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["rupay", "dreamfolks"], railway: true,
    ease: 5, ltf: false, fyf: false, approvalSpeed: "instant", eligibility: "Just need the bank account; issued with savings account.",
    feeNote: "RuPay Select DEBIT tier: ~2 domestic/quarter + railway. The easiest lounge access that exists.",
    confidence: "med", verify: "rupay.co.in debit lounge program + your bank" },
  { id: "rupay-platinum-debit", name: "RuPay Platinum Debit (any bank)", issuer: "Various", network: "rupay", type: "debit",
    domesticVisits: 2, period: "year", spendGate: null, programs: ["rupay", "dreamfolks"], railway: true,
    ease: 5, ltf: false, fyf: false, approvalSpeed: "instant", eligibility: "Common on basic savings accounts.",
    feeNote: "Lower allowance than Select. Often 1/quarter or 2/year.", confidence: "low", verify: "issuing bank debit T&C" },

  { id: "sbi-platinum-debit", name: "SBI Platinum Debit", issuer: "SBI", network: "visa", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: { amount: 75000, per: "quarter", note: "SBI added a prior-quarter spend requirement for debit lounge access." },
    programs: ["dreamfolks", "visa", "mastercard"], railway: false, ease: 5, ltf: false, fyf: false, approvalSpeed: "instant",
    eligibility: "Issued with eligible SBI savings account.", feeNote: "Annual debit fee applies. Lounge now spend-gated.",
    confidence: "low", verify: "sbi.co.in debit card lounge T&C (changed 2024-25)" },
  { id: "sbi-vishesh-debit", name: "SBI Vishesh / Yuva Debit", issuer: "SBI", network: "mastercard", type: "debit",
    domesticVisits: 1, period: "quarter", spendGate: { amount: 50000, per: "quarter", note: "Spend-gated debit lounge." },
    programs: ["dreamfolks", "mastercard"], railway: false, ease: 5, ltf: false, fyf: false, approvalSpeed: "instant",
    eligibility: "SBI account holders.", feeNote: "Spend-gated debit lounge.", confidence: "low", verify: "sbi.co.in" },

  { id: "hdfc-millennia-debit", name: "HDFC Millennia Debit", issuer: "HDFC", network: "mastercard", type: "debit",
    domesticVisits: 1, period: "quarter", spendGate: { amount: 75000, per: "quarter", note: "HDFC debit lounge requires prior-quarter spend." },
    programs: ["dreamfolks", "mastercard"], railway: false, ease: 5, ltf: false, fyf: false, approvalSpeed: "instant",
    eligibility: "HDFC savings account.", feeNote: "Spend-gated debit lounge.", confidence: "low", verify: "hdfcbank.com debit T&C" },
  { id: "hdfc-imperia-debit", name: "HDFC Imperia / Times Debit", issuer: "HDFC", network: "visa", type: "debit",
    domesticVisits: 1, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 4, ltf: false, fyf: false, approvalSpeed: "instant", eligibility: "Imperia banking relationship.",
    feeNote: "Premium debit; lounge tied to relationship tier.", confidence: "low", verify: "hdfcbank.com" },

  { id: "icici-coral-debit", name: "ICICI Coral Debit", issuer: "ICICI", network: "visa", type: "debit",
    domesticVisits: 1, period: "quarter", spendGate: { amount: 50000, per: "quarter", note: "Debit lounge spend-gated on newer terms." },
    programs: ["dreamfolks", "visa"], railway: true, ease: 5, ltf: false, fyf: false, approvalSpeed: "instant",
    eligibility: "ICICI savings account.", feeNote: "Spend-gated debit lounge + railway.", confidence: "low", verify: "icici.com debit T&C" },
  { id: "icici-sapphiro-debit", name: "ICICI Sapphiro / Expressions Debit", issuer: "ICICI", network: "visa", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: { amount: 50000, per: "quarter", note: "Spend-gated." },
    programs: ["dreamfolks", "visa", "mastercard"], railway: true, ease: 4, ltf: false, fyf: false, approvalSpeed: "instant",
    eligibility: "Higher-tier ICICI account.", feeNote: "Spend-gated debit lounge + railway.", confidence: "low", verify: "icici.com" },

  { id: "axis-burgundy-debit", name: "Axis Burgundy Debit", issuer: "Axis", network: "visa", type: "debit",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: true,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "fast", eligibility: "Axis Burgundy banking (high balance/relationship).",
    feeNote: "Premium debit: domestic + Priority Pass + railway via Burgundy.", confidence: "low", verify: "axisbank.com Burgundy T&C" },
  { id: "axis-priority-debit", name: "Axis Priority / Delight Debit", issuer: "Axis", network: "visa", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 4, ltf: false, fyf: false, approvalSpeed: "instant", eligibility: "Priority banking / eligible account.",
    feeNote: "Domestic debit lounge.", confidence: "low", verify: "axisbank.com" },

  { id: "kotak-privy-debit", name: "Kotak Privy League Debit", issuer: "Kotak", network: "visa", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 4, ltf: false, fyf: false, approvalSpeed: "fast", eligibility: "Privy League banking relationship.",
    feeNote: "Premium debit lounge.", confidence: "low", verify: "kotak.com" },

  { id: "yes-debit", name: "YES Bank Premia / Prosperity Debit", issuer: "YES Bank", network: "mastercard", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "mastercard"], railway: false,
    ease: 4, ltf: false, fyf: false, approvalSpeed: "instant", eligibility: "Eligible YES account.",
    feeNote: "Debit lounge on premium variants.", confidence: "low", verify: "yesbank.in" },

  { id: "federal-debit", name: "Federal Bank Imperio / Celesta Debit", issuer: "Federal Bank", network: "visa", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: true,
    ease: 4, ltf: false, fyf: false, approvalSpeed: "instant", eligibility: "Eligible Federal account.",
    feeNote: "Debit lounge + railway on premium variants.", confidence: "low", verify: "federalbank.co.in" },

  { id: "idbi-rupay-debit", name: "PSU RuPay Select Debit (SBI/BoB/PNB/Canara/Union)", issuer: "PSU banks", network: "rupay", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["rupay", "dreamfolks"], railway: true,
    ease: 5, ltf: false, fyf: false, approvalSpeed: "instant", eligibility: "Any of these PSU savings accounts.",
    feeNote: "RuPay Select debit: domestic + railway. Easiest broad access.", confidence: "low", verify: "issuing PSU bank + rupay.co.in" },

  { id: "indusind-debit", name: "IndusInd Pioneer / Exclusive Debit", issuer: "IndusInd", network: "visa", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 4, ltf: false, fyf: false, approvalSpeed: "instant", eligibility: "Eligible IndusInd account.",
    feeNote: "Premium debit lounge.", confidence: "low", verify: "indusind.com" },

  { id: "dbs-debit", name: "DBS Treasures Debit", issuer: "DBS", network: "visa", type: "debit",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "fast", eligibility: "DBS Treasures banking relationship.",
    feeNote: "Premium debit lounge.", confidence: "low", verify: "dbs.com/in" },

  // ==================================================================
  // ============  MORE CREDIT CARDS — co-brand + fintech  ============
  // ==================================================================
  // Travel co-brands, fintech cards, and newer variants. Most are confidence
  // "low" (not live-verified). Co-brand lounge benefits change with the airline/
  // partner deal, so verify especially after any merger (e.g. Vistara->Air India).

  // ---- Fintech / new-age (often free + lounge = great easy picks) ----
  { id: "scapia-federal", name: "Scapia (Federal Bank)", issuer: "Federal Bank", network: "visa",
    domesticVisits: 4, period: "year", spendGate: { amount: 5000, per: "month", note: "Lounge unlocks with small monthly spend (~₹5k) on most terms." },
    programs: ["dreamfolks", "visa"], railway: false, ease: 4, ltf: true, fyf: true, approvalSpeed: "fast",
    eligibility: "Popular free travel card; app-based, fast KYC.", feeNote: "Lifetime free. Domestic lounge + zero forex. Strong easy pick.",
    confidence: "low", verify: "scapia.in" },
  { id: "onecard", name: "OneCard (metal)", issuer: "BoB / SBM / Federal", network: "visa",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 4, ltf: true, fyf: true, approvalSpeed: "fast",
    eligibility: "App-based metal card, fast approval.", feeNote: "Lifetime free. No standard lounge — baseline (verify current offers).",
    confidence: "low", verify: "getonecard.app" },
  { id: "jupiter-edge", name: "Jupiter Edge (CSB/Federal)", issuer: "Federal/CSB", network: "visa",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 4, ltf: true, fyf: true, approvalSpeed: "fast",
    eligibility: "Neobank card.", feeNote: "No lounge on base — baseline.", confidence: "low", verify: "jupiter.money" },
  { id: "idfc-swyp", name: "IDFC FIRST SWYP", issuer: "IDFC FIRST", network: "rupay",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 5, ltf: false, fyf: true, approvalSpeed: "fast",
    eligibility: "EMI-first card, easy.", feeNote: "No lounge — baseline.", confidence: "low", verify: "idfcfirstbank.com" },

  // ---- HDFC co-brands ----
  { id: "hdfc-6e-indigo", name: "6E Rewards IndiGo HDFC (XL)", issuer: "HDFC", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "IndiGo flyer co-brand; XL variant has lounge.",
    feeNote: "XL variant: domestic lounge + IndiGo benefits.", confidence: "low", verify: "hdfcbank.com" },
  { id: "hdfc-tataneu-plus", name: "Tata Neu Plus HDFC", issuer: "HDFC", network: "rupay",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "rupay"], railway: false,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Entry Tata Neu; RuPay works on UPI.",
    feeNote: "₹499. Some domestic lounge on RuPay tier.", confidence: "low", verify: "hdfcbank.com" },
  { id: "hdfc-indianoil", name: "IndianOil HDFC", issuer: "HDFC", network: "rupay",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 4, ltf: false, fyf: true, approvalSpeed: "normal",
    eligibility: "Fuel co-brand.", feeNote: "Fuel rewards; no standard lounge — baseline.", confidence: "low", verify: "hdfcbank.com" },
  { id: "hdfc-pixel", name: "HDFC Pixel Play", issuer: "HDFC", network: "visa",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 4, ltf: false, fyf: true, approvalSpeed: "fast",
    eligibility: "Digital-first card.", feeNote: "No lounge on base — baseline.", confidence: "low", verify: "hdfcbank.com" },

  // ---- Axis co-brands ----
  { id: "axis-indianoil", name: "IndianOil Axis", issuer: "Axis", network: "visa",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 4, ltf: false, fyf: true, approvalSpeed: "fast",
    eligibility: "Fuel co-brand.", feeNote: "No standard lounge — baseline.", confidence: "low", verify: "axisbank.com" },
  { id: "axis-airtel", name: "Airtel Axis", issuer: "Axis", network: "mastercard",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 4, ltf: false, fyf: true, approvalSpeed: "fast",
    eligibility: "Utility cashback co-brand.", feeNote: "No lounge — baseline.", confidence: "low", verify: "axisbank.com" },
  { id: "axis-horizon", name: "Axis Horizon", issuer: "Axis", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Travel/miles card.",
    feeNote: "Domestic + international lounge, travel miles.", confidence: "low", verify: "axisbank.com" },
  { id: "axis-samsung", name: "Axis Samsung (Infinite/Signature)", issuer: "Axis", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Samsung co-brand; Infinite tier has lounge.",
    feeNote: "Infinite variant: domestic + Priority Pass.", confidence: "low", verify: "axisbank.com" },

  // ---- SBI co-brands ----
  { id: "sbi-air-india", name: "SBI Air India Platinum/Signature", issuer: "SBI", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Air India flyer co-brand.",
    feeNote: "Signature tier: domestic + Priority Pass.", confidence: "low", verify: "sbicard.com" },
  { id: "sbi-irctc", name: "SBI IRCTC (Premier)", issuer: "SBI", network: "rupay",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "rupay"], railway: true,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Rail traveller co-brand; RuPay.",
    feeNote: "Railway lounge focus + some airport.", confidence: "low", verify: "sbicard.com" },
  { id: "sbi-bpcl-octane", name: "SBI BPCL Octane", issuer: "SBI", network: "visa",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Fuel premium co-brand.",
    feeNote: "₹1499. Some domestic lounge + fuel rewards.", confidence: "low", verify: "sbicard.com" },
  { id: "sbi-miles", name: "SBI Miles / Miles Elite", issuer: "SBI", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Newer travel-miles series.",
    feeNote: "Travel card: domestic + Priority Pass on higher tier.", confidence: "low", verify: "sbicard.com" },

  // ---- ICICI co-brands / new ----
  { id: "icici-mmt", name: "MakeMyTrip ICICI (Signature)", issuer: "ICICI", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Travel co-brand.",
    feeNote: "Signature: domestic + Priority Pass + travel vouchers.", confidence: "low", verify: "icici.com" },
  { id: "icici-times-black", name: "ICICI Times Black", issuer: "ICICI", network: "visa",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: true,
    ease: 1, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "New super-premium, invite/HNW.",
    feeNote: "Premium. Unlimited domestic + Priority Pass + railway.", confidence: "low", verify: "icici.com" },

  // ---- IDFC new metal ----
  { id: "idfc-ashva", name: "IDFC FIRST Ashva (metal)", issuer: "IDFC FIRST", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: true,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Newer premium metal.",
    feeNote: "Domestic + Priority Pass + railway.", confidence: "low", verify: "idfcfirstbank.com" },
  { id: "idfc-mayura", name: "IDFC FIRST Mayura (metal)", issuer: "IDFC FIRST", network: "visa",
    domesticVisits: "unlimited", period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: true,
    ease: 1, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Top IDFC metal, invite-led.",
    feeNote: "Unlimited domestic + Priority Pass + railway.", confidence: "low", verify: "idfcfirstbank.com" },

  // ---- HSBC / SC new travel ----
  { id: "hsbc-travelone", name: "HSBC TravelOne", issuer: "HSBC", network: "mastercard",
    domesticVisits: 6, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "mastercard"], railway: false,
    ease: 3, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Travel-miles card.",
    feeNote: "₹4999. Domestic + international lounge.", confidence: "low", verify: "hsbc.co.in" },
  { id: "sc-easemytrip", name: "Standard Chartered EaseMyTrip", issuer: "Standard Chartered", network: "mastercard",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "mastercard"], railway: false,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Travel co-brand.",
    feeNote: "Domestic lounge + travel discounts.", confidence: "low", verify: "sc.com/in" },

  // ---- AU / Kotak / IndusInd more ----
  { id: "au-lit", name: "AU LIT (customisable)", issuer: "AU Small Finance", network: "visa",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: false,
    ease: 4, ltf: true, fyf: true, approvalSpeed: "fast", eligibility: "Feature-toggle card; turn lounge feature on.",
    feeNote: "Lifetime free base; pay only for features you enable (incl. lounge).", confidence: "low", verify: "aubank.in" },
  { id: "au-ixigo", name: "AU Ixigo", issuer: "AU Small Finance", network: "rupay",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "rupay"], railway: true,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "fast", eligibility: "Travel co-brand, RuPay (UPI).",
    feeNote: "Domestic + railway, travel rewards.", confidence: "low", verify: "aubank.in" },
  { id: "kotak-indianoil", name: "Kotak IndianOil", issuer: "Kotak", network: "visa",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 4, ltf: false, fyf: true, approvalSpeed: "fast",
    eligibility: "Fuel co-brand.", feeNote: "No standard lounge — baseline.", confidence: "low", verify: "kotak.com" },
  { id: "kotak-solitaire", name: "Kotak Solitaire", issuer: "Kotak", network: "mastercard",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "mastercard"], railway: false,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "normal", eligibility: "Premium banking relationship.",
    feeNote: "Domestic + Priority Pass.", confidence: "low", verify: "kotak.com" },
  { id: "indusind-eazydiner", name: "IndusInd EazyDiner", issuer: "IndusInd", network: "mastercard",
    domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "mastercard"], railway: false,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Dining co-brand.",
    feeNote: "Domestic lounge + dining benefits.", confidence: "low", verify: "indusind.com" },
  { id: "indusind-tiger", name: "IndusInd Tiger / Avios", issuer: "IndusInd", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority", "visa"], railway: false,
    ease: 3, ltf: true, fyf: false, approvalSpeed: "normal", eligibility: "Some LTF variants.",
    feeNote: "Domestic + Priority Pass.", confidence: "low", verify: "indusind.com" },

  // ---- RBL / BoB / PSU more ----
  { id: "rbl-irctc", name: "RBL IRCTC", issuer: "RBL", network: "rupay",
    domesticVisits: 2, period: "year", spendGate: null, programs: ["dreamfolks", "rupay"], railway: true,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Rail co-brand.",
    feeNote: "Railway lounge + some airport.", confidence: "low", verify: "rblbank.com" },
  { id: "bob-premier", name: "Bank of Baroda Premier / Select", issuer: "Bank of Baroda", network: "visa",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["dreamfolks", "visa"], railway: true,
    ease: 3, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "Mid income.",
    feeNote: "Domestic + railway.", confidence: "low", verify: "bobcard.co.in" },
  { id: "canara-rupay-cc", name: "Canara / PNB RuPay Select Credit", issuer: "PSU banks", network: "rupay",
    domesticVisits: 2, period: "quarter", spendGate: null, programs: ["rupay", "dreamfolks"], railway: true,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "normal", eligibility: "PSU bank customers.",
    feeNote: "RuPay Select credit: domestic + railway.", confidence: "low", verify: "issuing PSU bank T&C" },

  // ---- Amex more ----
  { id: "amex-smartearn", name: "Amex SmartEarn", issuer: "Amex", network: "amex",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false, ease: 3, ltf: false, fyf: true, approvalSpeed: "slow",
    eligibility: "Entry Amex.", feeNote: "₹495. No lounge — baseline.", confidence: "low", verify: "americanexpress.com/in" },
  { id: "amex-plat-reserve", name: "Amex Platinum Reserve", issuer: "Amex", network: "amex",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority"], railway: false,
    ease: 2, ltf: false, fyf: false, approvalSpeed: "slow", eligibility: "Premium.",
    feeNote: "₹10,000. Domestic + Priority Pass.", confidence: "low", verify: "americanexpress.com/in" },
];

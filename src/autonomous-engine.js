/**
 * Vinayak AI Autonomous Knowledge & Advisory Engine
 * High-precision offline statutory, tax, corporate compliance, and accounting intelligence core.
 * Ensures Vinayak AI remains operational and delivers accurate advisory even during upstream outages or credit limits.
 */

import { buildLegalLinksMarkdown } from "./legal-links.js";

export const SEXUAL_PATTERNS = [
  /\b(sex|sexy|sexual|sexuality|intercourse|coitus)\b/i,
  /\b(porn|porno|pornography|xxx|nsfw|erotic|erotica)\b/i,
  /\b(nude|nudes|nudity|naked|boobs|tits|titties|pussy|vagina|penis|dick|cock|clitoris)\b/i,
  /\b(masturbat\w*|orgasm\w*|ejaculat\w*|cumming|blowjob|handjob|dildo|vibrator)\b/i,
  /\b(horny|fetish|bdsm|kamasutra|stripper|strip\s*club|escort\s*service|prostitut\w*)\b/i,
  /\b(chut|choot|chudai|chudwana|lund|lauda|loda|gaand|bhosd\w*|mutth|sax\s*sux)\b/i
];

export function isInappropriateOrSexual(text) {
  if (!text) return false;
  return SEXUAL_PATTERNS.some((rgx) => rgx.test(text));
}

export function isRandomSymbolsWithoutText(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  // If it is only question mark(s), user specifically exempted it "(except ?)"
  if (/^\?+$/.test(trimmed)) return false;
  // Check if there are any letters or numbers (Unicode aware)
  const hasAlphanumeric = /[\p{L}\p{N}]/u.test(trimmed);
  return !hasAlphanumeric;
}

export function isQuestionMarkOnly(text) {
  if (!text) return false;
  return /^\?+$/.test(text.trim());
}

export const AutonomousEngine = {
  /**
   * Generates a streaming response using Vinayak AI's Autonomous Knowledge Core
   */
  async streamResponse(prompt, persona, signal, onChunk, onDone) {
    const startTime = performance.now();
    const content = this.resolveAnswer(prompt, persona);

    // Stream out words with realistic natural cadence
    const words = content.split(" ");
    let accumulated = "";

    for (let i = 0; i < words.length; i++) {
      if (signal && signal.aborted) {
        break;
      }
      const token = (i === 0 ? "" : " ") + words[i];
      accumulated += token;

      if (onChunk) {
        onChunk(token, accumulated);
      }

      // Variable natural typing speed (12-25ms)
      const delay = Math.min(25, Math.max(10, Math.floor(Math.random() * 18) + 8));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const durationMs = Math.round(performance.now() - startTime);
    if (onDone) {
      onDone({
        content: accumulated,
        durationMs,
        model: "vinayak-autonomous-engine",
      });
    }

    return accumulated;
  },

  /**
   * Matches user prompt to statutory knowledge repository or synthesizes professional advisory
   */
  resolveAnswer(prompt, persona = "general") {
    const raw = (prompt || "").trim();
    const p = raw.toLowerCase();

    // 0a. Inappropriate or sexual content guard
    if (isInappropriateOrSexual(raw)) {
      return `I am **Vinayak AI**, an advisory intelligence built exclusively for Indian accounting, tax consultancy, corporate compliance, and legal advisory.\n\nI am not made for sexual or explicit topics. Please let me know if you have any questions regarding business, finance, taxation, or statutory compliance.`;
    }

    // 0b. Random symbols without text (except ?)
    if (isRandomSymbolsWithoutText(raw)) {
      return `I didn't quite understand what you meant. Could you please rephrase or ask your question regarding Indian accounting, taxation, company law, or business advisory?`;
    }

    // 0c. Question mark only (e.g. "?", "???")
    if (isQuestionMarkOnly(raw)) {
      return `Hello! It looks like you have a question. How can I assist you with your Indian accounting, taxation, company law, or business inquiries today?`;
    }

    // 1. Identity & Creator queries
    if (p.includes("who made you") || p.includes("who created you") || p.includes("who developed you") || p.includes("who is your creator") || p.includes("made by")) {
      return `I was created by **Saswata**, as a specialized, self-learning AI assistant designed to revolutionize legal research, direct and indirect tax consultancy, corporate compliance, and accounting advisory.\n\nI am engineered to assist Chartered Accountants (CAs), Company Secretaries (CSs), tax practitioners, lawyers, business owners, and commerce students with statutory accuracy and practical workflows.`;
    }

    if (p.includes("who are you") || p.includes("what is your name") || p.includes("introduce yourself") || p.includes("tell me about yourself")) {
      return `Hello! I am **Vinayak AI**, your intelligent Legal, Tax, Corporate Compliance, Accounting & Business Advisory Assistant.\n\n### My Core Capabilities:\n- ⚖️ **Legal & Corporate Compliance:** Companies Act 2013, ROC/MCA annual filings (AOC-4, MGT-7), drafting Board Resolutions, Secretarial Standards (SS-1 & SS-2), and FEMA.\n- 📊 **Tax Consultancy:** Indian Income Tax Act 1961, Section 115BAC (New Regime) calculations, Capital Gains, TDS provisions (194C, 194J, 194Q), and GST compliance.\n- 💼 **Accounting & Tally Mastery:** Double-entry bookkeeping, Golden Rules, Tally Prime voucher shortcuts (F4-F9), BRS, Schedule II depreciation, and Balance Sheet finalization.\n- 📈 **Financial Modeling & Business:** CMA Data preparation, DSCR calculations, working capital estimation, and startup advisory.\n- 🎓 **CA & CS Student Mentorship:** Practical problem solving, ICAI/ICSI case studies, and conceptual clarity.\n\nHow can I assist you with your professional work today?`;
    }

    // 2. Greetings
    if (/^(hi|hello|hey|greetings|namaste|good morning|good afternoon|good evening)\b/i.test(p)) {
      return `Hello! I am **Vinayak AI**, your advisory partner for Legal, Tax, ROC Compliance, and Accounting.\n\nHow can I assist you today? You can ask me to:\n1. Draft a Board Resolution or Agreement\n2. Compute Tax liability under Section 115BAC\n3. Provide Tally voucher entries (Contra, Journal, Sales, Purchase)\n4. Explain GST ITC eligibility under Section 16 & 17(5)\n5. Calculate financial ratios like DSCR or prepare CMA data`;
    }

    let substantiveAnswer = "";

    // 3. Tally & Accounting Entries
    if (p.includes("contra") || (p.includes("tally") && p.includes("voucher")) || p.includes("f4") || p.includes("f7") || p.includes("journal entry")) {
      substantiveAnswer = `### 📘 Accounting & Tally Prime Voucher Mastery\n\nIn standard Indian double-entry bookkeeping and **Tally Prime / ERP 9**, voucher entries must strictly adhere to the statutory Golden Rules of Accounting:\n\n#### 1. The Golden Rules of Accounting:\n- **Real Accounts** (Assets, Cash): *Debit what comes in, Credit what goes out.*\n- **Personal Accounts** (Debtors, Creditors, Banks): *Debit the receiver, Credit the giver.*\n- **Nominal Accounts** (Expenses, Incomes): *Debit all expenses and losses, Credit all incomes and gains.*\n\n---\n\n#### 2. Essential Tally Function Keys & Voucher Types:\n\n| Key | Voucher Type | Usage & Description |\n| :--- | :--- | :--- |\n| **F4** | **Contra** | Internal cash/bank transfers (*Cash deposited to bank, cash withdrawn from bank for office use, transfer between two bank accounts*). No third party involved. |\n| **F5** | **Payment** | All outflow of funds (Cash or Bank) for paying expenses, vendors, or loan EMIs. |\n| **F6** | **Receipt** | All inflow of funds (Cash or Bank) from clients, sundry debtors, or capital introduced. |\n| **F7** | **Journal** | Pure non-cash adjustments (*Depreciation, year-end accruals, prepaid expenses, bad debts, rectification of errors*). |\n| **F8** | **Sales** | Sale of goods or services (generates GST Tax Invoice). |\n| **F9** | **Purchase** | Purchase of raw materials, capital goods, or services with ITC. |\n| **Alt + C** | *Master Shortcut* | Instantly create a new Ledger or Stock Item on the fly from any voucher screen. |\n\n---\n\n#### 3. Standard Practical Entries:\n- **Cash Deposited in HDFC Bank (₹50,000):**\n  - Voucher: **F4 (Contra)**\n  - Debit: *HDFC Bank A/c* (Personal - Receiver) ₹50,000\n  - Credit: *Cash A/c* (Real - Goes out) ₹50,000\n- **Depreciation on Machinery (₹20,000):**\n  - Voucher: **F7 (Journal)**\n  - Debit: *Depreciation A/c* (Nominal - Expense) ₹20,000\n  - Credit: *Machinery A/c* (Real - Asset reduction) ₹20,000`;
    } else if (p.includes("tax slab") || p.includes("115bac") || p.includes("income tax") || p.includes("new regime") || p.includes("old regime") || p.includes("itr")) {
      substantiveAnswer = `### 🏛️ Indian Income Tax Slabs: Section 115BAC (New Tax Regime)\n**Applicable for FY 2024-25 (AY 2025-26)** *(As amended by Finance Act)*\n\nThe New Tax Regime under Section 115BAC is the **default tax regime** for Individuals, HUFs, AOPs, and BOIs.\n\n#### 1. Income Tax Slab Rates:\n\n| Net Taxable Income Slab | Tax Rate |\n| :--- | :--- |\n| **Up to ₹3,00,000** | **Nil** |\n| **₹3,00,001 to ₹7,00,000** | **5%** |\n| **₹7,00,001 to ₹10,00,000** | **10%** |\n| **₹10,00,001 to ₹12,00,000** | **15%** |\n| **₹12,00,001 to ₹15,00,000** | **20%** |\n| **Above ₹15,00,000** | **30%** |\n\n#### 2. Key Benefits under New Regime:\n- **Standard Deduction:** Increased to **₹75,000** for salaried employees and pensioners (previously ₹50,000).\n- **Rebate under Section 87A:** Available for taxable income up to **₹7,00,000**, effectively resulting in **ZERO net tax** for salaried individuals with gross salary up to **₹7.75 Lakhs**.\n- **Surcharge Cap:** The highest surcharge rate on high-net-worth individuals is capped at **25%** (down from 37% under the Old Regime).\n- **Health & Education Cess:** 4% applicable on total income tax plus surcharge.\n\n#### 3. Old vs. New Regime Comparison Strategy:\n- Choose **New Regime** if your total chapter VI-A deductions (80C, 80D, home loan interest u/s 24b) are less than ₹3.75 - ₹4.0 Lakhs.\n- Choose **Old Regime** if you have heavy deductions (*₹1.5L u/s 80C, ₹50k NPS u/s 80CCD(1B), ₹50k-₹1L u/s 80D medical insurance, and ₹2L home loan interest*).`;
    } else if (p.includes("gst") || p.includes("itc") || p.includes("input tax credit") || p.includes("17(5)") || p.includes("rcm") || p.includes("gstr")) {
      substantiveAnswer = `### 📦 GST Advisory: Input Tax Credit (ITC) & Statutory Rules\n\n#### 1. Conditions for Claiming ITC (Section 16(2) of CGST Act):\nTo legally claim ITC in **GSTR-3B**, a registered taxable person must satisfy all 5 statutory conditions:\n1. **Possession of Tax Invoice:** Must hold a valid Tax Invoice or Debit Note issued by a registered supplier.\n2. **Receipt of Goods / Services:** The goods or services must have been actually received.\n3. **Tax Paid to Government:** The tax charged must have been paid to the Government (in cash or through admissible ITC) by the supplier.\n4. **GSTR-2B Auto-Population:** The invoice must be properly reflected in your **GSTR-2B** statement.\n5. **Return Filing:** The recipient must have furnished the return under Section 39 (Form GSTR-3B).\n\n---\n\n#### 2. Blocked Credits under Section 17(5) (Ineligible ITC):\nITC is **strictly blocked** on the following expenses, even if used for business purposes:\n- **Motor Vehicles:** Vehicles for transportation of persons with seating capacity ≤ 13 persons *(Exceptions: Used for further supply of vehicles, transportation of passengers, or driving school)*.\n- **Food, Beverages & Outdoor Catering:** Club membership, fitness centre, life & health insurance *(Exception: Mandated by law/government regulations)*.\n- **Works Contract for Immovable Property:** Construction of immovable property on own account *(Exception: Plant and machinery)*.\n- **Personal Consumption:** Goods or services used for personal consumption.\n- **Lost, Stolen, or Destroyed Goods:** Goods written off, gifted, or distributed as free samples.\n\n---\n\n#### 3. Reverse Charge Mechanism (RCM - Section 9(3)):\n- Recipient pays GST directly to the Government on specified notified supplies (*e.g., GTA services, Legal Services by Advocates, Sponsorship services, Director fees*).\n- *Tax paid under RCM in cash is eligible for ITC in the same month subject to Section 16.*`;
    } else if (p.includes("board resolution") || p.includes("companies act") || p.includes("roc") || p.includes("director") || p.includes("aoc-4") || p.includes("mgt-7")) {
      substantiveAnswer = `### 📜 Corporate Secretarial & ROC Advisory (Companies Act, 2013)\n\n#### 1. Draft Board Resolution: Opening of Bank Account\n> **CERTIFIED TRUE COPY OF THE RESOLUTION PASSED AT THE MEETING OF THE BOARD OF DIRECTORS OF [COMPANY NAME] PRIVATE LIMITED HELD ON [DATE] AT [REGISTERED OFFICE ADDRESS]**\n>\n> **\"RESOLVED THAT** a Current Account in the name and style of the Company be opened with **[Bank Name]**, [Branch Address].\n>\n> **RESOLVED FURTHER THAT** the said bank be instructed and authorized to honour all cheques, bills of exchange, and promissory notes drawn, accepted, or signed on behalf of the Company by **[Name of Director 1]**, Director (DIN: [________]) and/or **[Name of Director 2]**, Director (DIN: [________]), singly / jointly.\n>\n> **RESOLVED FURTHER THAT** [Name of Director] be and is hereby authorized to sign the account opening form, submit KYC documents, and perform all necessary acts to give effect to this resolution.\"*\n>\n> **For [Company Name] Private Limited**\n> _______________________\n> **[Director Name]**\n> Director (DIN: [________])\n\n---\n\n#### 2. Annual ROC Compliance Calendar for Private Limited Companies:\n| Form | Purpose | Statutory Due Date |\n| :--- | :--- | :--- |\n| **DIR-3 KYC** | Annual KYC of all Directors holding valid DIN | **30th September** |\n| **ADT-1** | Intimation of Auditor Appointment | Within 15 days of AGM |\n| **AOC-4** | Filing Financial Statements (Balance Sheet, P&L, Notes) | Within 30 days of AGM (typically **29th-30th October**) |\n| **MGT-7 / 7A** | Filing Annual Return of the Company | Within 60 days of AGM (typically **28th-29th November**) |`;
    } else if (p.includes("cma") || p.includes("dscr") || p.includes("ratio") || p.includes("working capital") || p.includes("math")) {
      substantiveAnswer = `### 📊 Financial Engineering: CMA Data & DSCR Analysis\n\n#### 1. DSCR (Debt Service Coverage Ratio) Formula:\nDSCR measures the entity's ability to service its long-term debt commitments (interest and principal repayment):\n\n$$\\text{DSCR} = \\frac{\\text{Net Profit After Tax (PAT)} + \\text{Depreciation} + \\text{Interest on Term Loan}}{\\text{Interest on Term Loan} + \\text{Principal Repayment Installment}}$$\n\n- **Bank Benchmark:** Ideal DSCR is between **1.50 to 2.00**.\n- A DSCR below 1.20 indicates high financial distress for project loan approvals.\n\n---\n\n#### 2. Key Solvency & Liquidity Ratios for Credit Underwriting:\n- **Current Ratio:** $\\frac{\\text{Current Assets}}{\\text{Current Liabilities}}$ *(Standard Banking Benchmark: 1.33:1 as per Tandon Committee guidelines)*.\n- **Quick / Acid-Test Ratio:** $\\frac{\\text{Current Assets} - \\text{Inventory}}{\\text{Current Liabilities}}$ *(Ideal: 1:1)*.\n- **Debt-to-Equity Ratio:** $\\frac{\\text{Total Outside Debt}}{\\text{Net Worth / Tangible Equity}}$ *(Ideal: ≤ 2:1)*.\n\n---\n\n#### 3. CMA Data (Credit Monitoring Arrangement) Structure:\n1. **Form I:** Existing & Proposed limits from banking system.\n2. **Form II:** Operating Statement (Historical & projected Net Sales, Cost of Sales, Operating Profit, PAT).\n3. **Form III:** Analysis of Balance Sheet (Liabilities & Assets segregated into Current and Non-Current).\n4. **Form IV:** Comparative Statement of Current Assets & Current Liabilities.\n5. **Form V:** Calculation of Maximum Permissible Bank Finance (MPBF) under Turnover / Lending Method.\n6. **Form VI & VII:** Fund Flow Statement & Financial Ratio Summary.`;
    } else {
      substantiveAnswer = `### ⚖️ Vinayak AI Statutory & Professional Advisory\n\nRegarding your inquiry on **"${prompt}"**:\n\nIn accordance with standard Indian statutory provisions, corporate practices, and ICAI/ICSI frameworks:\n\n1. **Statutory Framework:**\n   - Compliance must align with the respective provisions of the **Income Tax Act 1961**, **Companies Act 2013**, and the **CGST Act 2017**.\n   - Ensure all source documents, vouchers, and board/shareholder approvals are properly documented and retained for a minimum statutory period of 8 preceding financial years.\n\n2. **Accounting & Tax Treatment:**\n   - Revenue recognition should comply with **Ind AS 115 / AS 9**, ensuring performance obligations and consideration are clearly identified.\n   - Ensure proper TDS/TCS applicability is evaluated prior to credit or disbursement.\n\n3. **Recommended Next Steps:**\n   - Verify supporting agreements, contracts, and challans.\n   - Check whether any threshold limits under relevant notifications or circulars are exceeded.\n\n*Would you like me to draft a specific legal clause, compute a detailed tax calculation, or provide the exact Tally journal entry for this scenario?*`;
    }

    const legalLinks = buildLegalLinksMarkdown(substantiveAnswer, prompt);
    return substantiveAnswer + (legalLinks || "");
  },
};

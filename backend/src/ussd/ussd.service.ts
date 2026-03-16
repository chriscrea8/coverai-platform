import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadsService } from '../leads/leads.service';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';

// ── USSD Menu Constants ───────────────────────────────────────────────────────
const MENU_MAIN = `CON Welcome to CoverAI 🛡️
Nigeria's AI Insurance Platform

1. Learn about insurance
2. Get a quote
3. File a claim
4. Check my policy
5. Talk to ARIA (AI advisor)
0. Exit`;

const MENU_LEARN = `CON Insurance Education
1. What is insurance?
2. Motor insurance explained
3. Health insurance explained
4. Business insurance
5. How to file a claim
0. Back`;

const MENU_QUOTE = `CON Get Insurance Quote
What type of insurance?
1. Motor (Car/Vehicle)
2. Health/Medical
3. Fire & Burglary (Shop)
4. Life Insurance
5. Business Package
0. Back`;

const MENU_CLAIM = `CON File a Claim
1. Motor accident claim
2. Theft/Burglary claim
3. Health claim
4. Fire damage claim
0. Back`;

const LEARN_CONTENT: Record<string, string> = {
  '1': `END Insurance is a financial safety net. You pay a small amount (premium) regularly. If something bad happens — fire, accident, theft — the company pays you back. NAICOM regulates all insurers in Nigeria. Visit coverai-platform.vercel.app to learn more.`,
  '2': `END Motor Insurance:\n• Third Party (legal minimum) - ₦5k-15k/yr\n• Covers damage you cause others\n• Comprehensive - 2-5% of car value\n• Covers your own car too\nFRSC can fine you without it!`,
  '3': `END Health Insurance:\n• HMO plans - monthly/annual\n• Covers hospital bills directly\n• Annual limits ₦500k-₦5M\n• Excludes pre-existing conditions\nPopular: AXA Mansard, Hygeia`,
  '4': `END Business Insurance:\n• Fire & Burglary - protects stock\n• Public Liability - customer injuries\n• Business Interruption - lost income\n• BOP bundle saves money\nCost: ₦40k-150k/year`,
  '5': `END How to File a Claim:\n1. Report within 24-48 hours\n2. Take photos immediately\n3. Get police report if needed\n4. Submit via coverai-platform.vercel.app\n5. Approved in 5-30 days`,
};

const MOTOR_QUOTE_INFO = `END Motor Insurance Quote\n\nThird Party: ₦5,000-₦15,000/yr\nComprehensive: 2-5% of car value\n\nExample:\n• ₦3M car → ₦60k-150k/yr\n• ₦1M car → ₦20k-50k/yr\n\nTo buy: coverai-platform.vercel.app\nOr call us: We'll contact you!\n\nType *347# again to restart`;

const HEALTH_QUOTE_INFO = `END Health Insurance Quote\n\nIndividual: ₦30k-100k/yr\nFamily plan: ₦80k-250k/yr\nCorporate: ₦20k-60k per staff\n\nCovers: Hospital, Surgery, Labs\n\nTo buy: coverai-platform.vercel.app\nType *347# to restart`;

const FIRE_QUOTE_INFO = `END Fire & Burglary Quote\n\nShop/Office: ₦15k-60k/yr\nWarehouse: ₦30k-100k/yr\n\nCovers: Fire damage, Break-ins,\nStock loss, Equipment\n\nTo buy: coverai-platform.vercel.app\nType *347# to restart`;

const LIFE_QUOTE_INFO = `END Life Insurance Quote\n\nTerm Life: ₦30k-80k/yr\nFor ₦5M cover (35yr healthy)\n\nWhole Life: More expensive,\nbut guaranteed payout\n\nRule: Get 10x annual income\n\nTo buy: coverai-platform.vercel.app`;

const BUSINESS_QUOTE_INFO = `END Business Package (BOP) Quote\n\nSmall business: ₦40k-80k/yr\nMedium business: ₦80k-200k/yr\n\nIncludes:\n• Fire & Burglary\n• Public Liability\n• Business Interruption\n\nTo buy: coverai-platform.vercel.app`;

const CLAIM_GUIDES: Record<string, string> = {
  '1': `END Motor Claim Steps:\n1. Stay calm, ensure safety\n2. Take photos of damage\n3. Get police report (mandatory)\n4. Note other driver's details\n5. Report to insurer within 48hrs\n6. Visit coverai-platform.vercel.app\n\nHotline: Call your insurer immediately`,
  '2': `END Theft/Burglary Claim:\n1. Call police IMMEDIATELY\n2. Get police report (crucial)\n3. List all stolen items + values\n4. Take photos of break-in\n5. Don't clean up until assessed\n6. Submit via coverai-platform.vercel.app`,
  '3': `END Health Claim Steps:\n1. Visit your HMO hospital\n2. Show your HMO card\n3. For emergencies: any hospital\n4. Keep all receipts\n5. Submit claim form + receipts\n6. Visit coverai-platform.vercel.app`,
  '4': `END Fire Damage Claim:\n1. Ensure everyone is safe first\n2. Call fire service & police\n3. Take photos BEFORE cleanup\n4. Get fire service report\n5. List all damaged items\n6. Submit via coverai-platform.vercel.app\n\nDo NOT repair before assessment!`,
};

@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);

  constructor(
    private readonly leadsService: LeadsService,
    @InjectRepository(InsuranceProduct)
    private readonly productRepo: Repository<InsuranceProduct>,
  ) {}

  async handleSession(sessionId: string, phoneNumber: string, text: string): Promise<string> {
    const steps = text.split('*').filter(s => s !== '');

    // Root menu
    if (steps.length === 0) return MENU_MAIN;

    const step1 = steps[0];

    // ── 1. Learn ──────────────────────────────────────────────────────────────
    if (step1 === '1') {
      if (steps.length === 1) return MENU_LEARN;
      const choice = steps[1];
      if (choice === '0') return MENU_MAIN;
      return LEARN_CONTENT[choice] || `END Invalid option. Type *347# to restart.`;
    }

    // ── 2. Get Quote ──────────────────────────────────────────────────────────
    if (step1 === '2') {
      if (steps.length === 1) return MENU_QUOTE;
      const choice = steps[1];
      if (choice === '0') return MENU_MAIN;

      // Step 3: Ask for phone confirmation
      if (steps.length === 2) {
        const quoteMap: Record<string, string> = {
          '1': MOTOR_QUOTE_INFO,
          '2': HEALTH_QUOTE_INFO,
          '3': FIRE_QUOTE_INFO,
          '4': LIFE_QUOTE_INFO,
          '5': BUSINESS_QUOTE_INFO,
        };

        const quoteText = quoteMap[choice];
        if (!quoteText) return `END Invalid option. Type *347# to restart.`;

        // Auto-create lead for quote request
        const typeMap: Record<string, string> = {
          '1': 'motor', '2': 'health', '3': 'property', '4': 'life', '5': 'business',
        };
        this.leadsService.create({
          phone: phoneNumber,
          insuranceType: typeMap[choice] || 'general',
          source: 'ussd',
          sessionId,
          notes: `USSD quote request for ${typeMap[choice]}`,
          metadata: { ussdSession: sessionId, step: 'quote_requested' },
        }).catch(() => {});

        return quoteText;
      }
    }

    // ── 3. File a Claim ───────────────────────────────────────────────────────
    if (step1 === '3') {
      if (steps.length === 1) return MENU_CLAIM;
      const choice = steps[1];
      if (choice === '0') return MENU_MAIN;
      return CLAIM_GUIDES[choice] || `END Invalid option. Type *347# to restart.`;
    }

    // ── 4. Check Policy ───────────────────────────────────────────────────────
    if (step1 === '4') {
      if (steps.length === 1) {
        return `CON Check My Policy\nEnter your policy number:\n(e.g. POL-2026-001234)\n\n0. Back`;
      }
      if (steps[1] === '0') return MENU_MAIN;

      const policyNum = steps[1].toUpperCase();
      // Return instructions since we can't do DB lookup easily here
      return `END Policy Lookup\n\nPolicy: ${policyNum}\n\nTo check full details:\nVisit coverai-platform.vercel.app\nor login to your dashboard\n\nType *347# to restart`;
    }

    // ── 5. Talk to ARIA ───────────────────────────────────────────────────────
    if (step1 === '5') {
      if (steps.length === 1) {
        return `CON Ask ARIA - AI Insurance Advisor\n1. Is my shop insured for fire?\n2. Do I need motor insurance?\n3. How do I save on premiums?\n4. What is excess/deductible?\n5. Can I insure my phone?\n0. Back`;
      }
      if (steps[1] === '0') return MENU_MAIN;

      const ariaAnswers: Record<string, string> = {
        '1': `END ARIA says:\nYour shop needs Fire & Burglary insurance. One fire can destroy everything you've built. Cost is ₦15k-60k/year depending on stock value. Very affordable protection!\n\nBuy now: coverai-platform.vercel.app`,
        '2': `END ARIA says:\nYes! Third Party Motor Insurance is LEGALLY REQUIRED in Nigeria. FRSC can impound your car without it. Cost: just ₦5k-15k/year. Comprehensive covers your own car too.\n\nBuy now: coverai-platform.vercel.app`,
        '3': `END ARIA's Premium Tips:\n1. Pay annually (monthly costs more)\n2. Increase your excess/deductible\n3. Install security measures\n4. Bundle multiple policies\n5. Build a no-claims history\n\nSave up to 30% with these tips!`,
        '4': `END ARIA explains Excess:\nAn excess (deductible) is what YOU pay first before insurance pays the rest.\n\nExample: ₦50k excess, ₦500k claim\n→ You pay ₦50k\n→ Insurance pays ₦450k\n\nHigher excess = lower premium`,
        '5': `END ARIA says:\nYes! Phones can be insured under All Risks Insurance or Gadget Cover.\n\nFor a ₦500k phone:\n~₦25k-50k/year\n\nCovers: theft, accidental damage, water damage\n\nBuy now: coverai-platform.vercel.app`,
      };

      return ariaAnswers[steps[1]] || `END Invalid option. Type *347# to restart.`;
    }

    // ── 0. Exit ───────────────────────────────────────────────────────────────
    if (step1 === '0') {
      return `END Thank you for using CoverAI!\n\nGet full coverage at:\ncoverai-platform.vercel.app\n\nARIA is available 24/7 on WhatsApp.\nStay protected! 🛡️`;
    }

    return `END Invalid option.\nType *347# to return to main menu.`;
  }
}

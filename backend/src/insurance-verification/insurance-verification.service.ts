import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Policy, PolicyStatus } from '../policies/policy.entity';
import { InsuranceProduct } from '../insurance-products/insurance-product.entity';
import { InsuranceProvider } from '../insurance-providers/insurance-provider.entity';
import { ConfigService } from '@nestjs/config';
import { KycService } from '../kyc/kyc.service';

// ─────────────────────────────────────────────────────────────────────────────
// NOTE ON NIID INTEGRATION:
// The Nigeria Insurance Industry Database (NIID) is managed by the Nigeria
// Insurers Association (NIA). As of 2026, it does not offer a public REST API.
// To integrate with NIID when access is granted:
//   1. Replace the internal DB lookup in verifyByPlate() with an HTTP call to
//      the NIID API endpoint (e.g. https://api.niid.naicom.gov.ng/verify)
//   2. Set NIID_API_KEY and NIID_BASE_URL environment variables
//   3. The response shape is already designed to match NIID's expected format
//
// For now: we query our own policies table and match on the vehicle plate
// stored in policy.coverageDetails.plateNumber (JSONB field).
// ─────────────────────────────────────────────────────────────────────────────

export interface VerificationResult {
  status: 'valid' | 'expired' | 'not_found' | 'error';
  plate?: string;
  policy_number?: string;
  policy_type?: string;
  provider?: string;
  insured_name?: string;
  expiry_date?: string;
  days_remaining?: number;
  source?: string;
  message?: string;
  checked_at: string;
}

@Injectable()
export class InsuranceVerificationService {
  private readonly logger = new Logger(InsuranceVerificationService.name);

  constructor(
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    @InjectRepository(InsuranceProduct) private readonly productRepo: Repository<InsuranceProduct>,
    @InjectRepository(InsuranceProvider) private readonly providerRepo: Repository<InsuranceProvider>,
    private readonly configService: ConfigService,
    private readonly kycService: KycService,
  ) {}

  async verify(params: { plate?: string; policy?: string }): Promise<VerificationResult> {
    const checkedAt = new Date().toISOString();

    try {
      // Try NIID external API first if configured (future integration point)
      const niidKey = this.configService.get<string>('NIID_API_KEY');
      if (niidKey && params.plate) {
        const niidResult = await this.checkNIID(params.plate, niidKey);
        if (niidResult) return { ...niidResult, source: 'NIID', checked_at: checkedAt };
      }

      // Fall back to internal database lookup
      return await this.verifyInternal(params, checkedAt);
    } catch (error) {
      this.logger.error('Verification error', error);
      return {
        status: 'error',
        message: 'Verification service temporarily unavailable. Please try again.',
        checked_at: checkedAt,
      };
    }
  }

  private async verifyInternal(
    params: { plate?: string; policy?: string },
    checkedAt: string,
  ): Promise<VerificationResult> {
    let policies: Policy[] = [];

    if (params.policy) {
      // Search by policy number (exact match)
      policies = await this.policyRepo.find({
        where: { policyNumber: params.policy.toUpperCase() },
      });
    } else if (params.plate) {
      // Search by plate number stored in coverageDetails JSONB
      const plateCleaned = params.plate.toUpperCase().replace(/\s+/g, '');

      // TypeORM JSONB query for plate number
      policies = await this.policyRepo
        .createQueryBuilder('policy')
        .where(`policy.coverage_details->>'plateNumber' = :plate`, { plate: plateCleaned })
        .orWhere(`policy.coverage_details->>'plate' = :plate`, { plate: plateCleaned })
        .orWhere(`policy.coverage_details->>'vehiclePlate' = :plate`, { plate: plateCleaned })
        .getMany();

      // Also search via notes/metadata if plate stored there
      if (!policies.length) {
        policies = await this.policyRepo
          .createQueryBuilder('policy')
          .where(`LOWER(policy.coverage_details::text) LIKE :plate`, {
            plate: `%${plateCleaned.toLowerCase()}%`,
          })
          .andWhere('policy.policy_status IN (:...statuses)', {
            statuses: [PolicyStatus.ACTIVE, PolicyStatus.PENDING],
          })
          .take(5)
          .getMany();
      }
    }

    if (!policies.length) {
      // No insurance found internally — check VerifyMe FRSC for vehicle ownership
      const frscData = params.plate ? await this.kycService.verifyPlateNumber(params.plate) : null;

      return {
        status: 'not_found',
        plate: params.plate?.toUpperCase(),
        // If FRSC confirms vehicle exists, give more specific message
        message: frscData?.found
          ? `Vehicle registered to ${frscData.owner} (${frscData.vehicle}, ${frscData.state}) does not have valid insurance in our database. Insure this vehicle now on CoverAI or check naicom.gov.ng for policies from other insurers.`
          : 'This vehicle does not appear to have valid insurance in our database. For full NIID verification, visit naicom.gov.ng.',
        frsc: frscData?.found ? {
          owner: frscData.owner,
          vehicle: frscData.vehicle,
          state: frscData.state,
          source: frscData.source,
        } : undefined,
        source: 'CoverAI Internal + VerifyMe FRSC',
        checked_at: checkedAt,
      };
    }

    // Find the most recent active policy
    const activePolicies = policies.filter(p => p.policyStatus === PolicyStatus.ACTIVE);
    const policy = activePolicies.length > 0
      ? activePolicies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      : policies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    // Get provider name
    let providerName = 'CoverAI Partner';
    if (policy.providerId) {
      const provider = await this.providerRepo.findOne({ where: { id: policy.providerId } });
      if (provider) providerName = provider.name;
    }

    // Get product type
    let productType = 'Motor Insurance';
    if (policy.productId) {
      const product = await this.productRepo.findOne({ where: { id: policy.productId } });
      if (product) productType = product.productName;
    }

    // Calculate days remaining
    const expiryDate = policy.endDate ? new Date(policy.endDate) : null;
    const now = new Date();
    const daysRemaining = expiryDate
      ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const isExpired = expiryDate && expiryDate < now;
    const status = isExpired ? 'expired' : 'valid';

    // Enrich with FRSC ownership data for confirmed policies
    const frscEnrich = params.plate ? await this.kycService.verifyPlateNumber(params.plate) : null;

    return {
      status,
      plate: params.plate?.toUpperCase(),
      policy_number: policy.policyNumber,
      policy_type: productType,
      provider: providerName,
      expiry_date: expiryDate ? expiryDate.toISOString().split('T')[0] : 'N/A',
      days_remaining: daysRemaining,
      frsc: frscEnrich?.found ? {
        owner: frscEnrich.owner,
        vehicle: frscEnrich.vehicle,
        state: frscEnrich.state,
        source: frscEnrich.source,
      } : undefined,
      source: 'CoverAI Internal + VerifyMe FRSC',
      message: isExpired
        ? `This policy expired on ${expiryDate?.toDateString()}. Please renew immediately.`
        : daysRemaining && daysRemaining <= 30
        ? `Policy valid but expires in ${daysRemaining} days. Consider renewing soon.`
        : undefined,
      checked_at: checkedAt,
    };
  }

  // ── NIID Integration Stub ─────────────────────────────────────────────────
  // When NIA provides API access, implement this method:
  private async checkNIID(plate: string, apiKey: string): Promise<Partial<VerificationResult> | null> {
    try {
      const baseUrl = this.configService.get<string>('NIID_BASE_URL') || 'https://api.niid.naicom.gov.ng';
      const response = await fetch(`${baseUrl}/verify?plate=${plate}`, {
        headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      const data: any = await response.json();
      // Map NIID response to our VerificationResult shape
      return {
        status: data.status === 'active' ? 'valid' : data.status === 'expired' ? 'expired' : 'not_found',
        plate: plate.toUpperCase(),
        policy_number: data.policyNo || data.policy_number,
        policy_type: data.insuranceType || data.policy_type,
        provider: data.insurer || data.provider,
        expiry_date: data.expiryDate || data.expiry_date,
        insured_name: data.insuredName,
      };
    } catch {
      return null; // Fall back to internal DB
    }
  }
}

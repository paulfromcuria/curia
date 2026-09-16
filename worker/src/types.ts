/**
 * Shared shapes for the 8-stage pipeline. Deliberately mirrors the real
 * app's src/types/models.ts field names where the concepts overlap
 * (name/type/spendLevel/districtId/etc.) so mapping a candidate onto a
 * real Venue at promotion time (run-promotion.ts) is closer to identity
 * than translation.
 */

export type MetroId = string;
export type CandidateStatus =
  | 'discovered'
  | 'verified'
  | 'copy_drafted'
  | 'voice_qa_passed'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'promoted'
  | 'needs_new_type';

export type Ownership = 'independent' | 'small_group' | 'group' | 'high_street';

export interface DistrictBrief {
  id: string;
  name: string;
  metro: MetroId;
  lat: number;
  lon: number;
  /** Editorial character description — same register as the real
   * District.editorialDescription, feeds Discover's own prompt. */
  character?: string;
  /** Existing venue names in this district, for dedupe — never propose a
   * candidate that's really the same real-world venue as one of these. */
  existingVenueNames: string[];
  /** Non-English markets (Riyadh) get local-language search per the
   * Riyadh-second-pass lesson (see docs/data/venues.json's own
   * _riyadhVenueSourceSecondPass note — Arabic-language sourcing nearly
   * doubled real yield there versus English-only search). */
  searchLanguageHint?: string;
}

export interface VenueCandidateDraft {
  name: string;
  type: string;
  subPreferenceTags: string[];
  spendLevel?: number;
  districtId: string;
  metro: MetroId;
  lat?: number;
  lon?: number;
  petFriendly: boolean;
  dietaryOptions: string[];
  description?: string;
  bands: string[];
  base?: number;

  gate1Reasoning?: string;
  distinctivenessProposed?: number;
  distinctivenessReasoning?: string;
  ownership?: Ownership;
  ownershipEvidence?: Record<string, unknown>;

  status: CandidateStatus;
  sources: Array<{ url?: string; note: string }>;
  coordinateMethod?: string;
  dedupeKey: string;
  rejectReason?: string;
}

export interface DistrictCandidateDraft {
  name: string;
  region: string;
  bounds?: Record<string, unknown>;
  character?: string;
  rationale?: string;
  status: 'discovered' | 'verified' | 'pending_review' | 'approved' | 'rejected' | 'promoted';
  sources: Array<{ url?: string; note: string }>;
  rejectReason?: string;
}

export interface WorkerRunSummary {
  market: string;
  districtsTargeted: string[];
  candidatesDiscovered: number;
  verified: number;
  copyPassed: number;
  submittedForReview: number;
  apiCostUsd: number;
  notes?: string;
}

export interface ReviewFeedbackEntry {
  candidateName: string;
  decision: 'approved' | 'rejected';
  reason?: string;
}

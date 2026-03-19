/**
 * Shared contracts used by:
 * - browser extension
 * - API FastAPI
 * - admin dashboard
 */

export type SecurityAction = "ALLOW" | "ANONYMIZE" | "BLOCK" | "WARN";

export interface AnalyzeRequest {
  requestId: string;
  platform: "chatgpt" | "claude" | "gemini" | "unknown";
  prompt: string;
  userConsent?: boolean;
  metadata?: {
    pageUrl?: string;
    sessionId?: string;
    tenantId?: string;
  };
}

export interface DetectionHit {
  type:
    | "EMAIL"
    | "PHONE"
    | "IBAN"
    | "API_KEY"
    | "PASSWORD"
    | "TOKEN"
    | "INTERNAL_URL"
    | "SOURCE_CODE";
  valuePreview: string;
  confidence: number;
}

export interface RedactionProposal {
  original: string;
  replacement: string;
  reason: string;
}

export interface AnalyzeResponse {
  requestId: string;
  action: SecurityAction;
  riskScore: number;
  reasons: string[];
  detections: DetectionHit[];
  redactions: RedactionProposal[];
  createdAt: string;
}

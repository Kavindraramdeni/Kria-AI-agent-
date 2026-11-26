import { WebsiteAgentOutputSchema } from '@/lib/agents/schemas';
import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { PROMPT_INJECTION_DEFENSE } from '@/lib/agents/guardrails';
import { createClient } from '@/lib/supabase/server';
import { createApprovalRequest } from '@/lib/services/approvals';
import { logActivity } from '@/lib/services/activity-logs';
import {
  inspectHtml,
  HtmlInspectionResult,
  MeasurableCheck,
} from '@/lib/services/html-inspector';
import {
  validateProductClaims,
  resolveProductGrounding,
  ProductConflict,
} from '@/lib/services/product-grounding';
import { z } from 'zod';

export type WebsiteAgentOutput = z.infer<typeof WebsiteAgentOutputSchema>;

export interface WebsiteAuditRequest {
  target_url: string;
  product_name?: string;
  sku?: string;
  topic_or_prompt?: string;
  actor_email?: string;
  supabaseClient?: any;
  mockHtml?: string; // Used for deterministic offline tests
}

export interface WebsiteAuditResult {
  success: boolean;
  execution_mode: 'live_ai' | 'hardcoded' | 'error';
  model_invoked: boolean;
  is_simulated: boolean;
  model_name?: string;
  output?: WebsiteAgentOutput;
  measured_score?: number;
  inspection_checks?: MeasurableCheck[];
  saved_audit_id?: string;
  approval_id?: string;
  conflicts_detected?: ProductConflict[];
  error?: string;
}

/**
 * Website UX & On-Page Audit Agent: Genuinely AI-Powered Technical Audit Engine
 * 1. Validates target URL
 * 2. Fetches real HTML from the web (never claims scanned if fetch failed)
 * 3. Inspects measurable HTML technical tags, OpenGraph, viewport & Schema.org JSON-LD
 * 4. Calculates deterministic score from measurable evidence (0-100)
 * 5. Uses Google Gemini AI to synthesize technical SEO remediation and mobile UX guidance
 * 6. Persists audit in Supabase seo_audits table and routes proposal to Approval Queue
 */
export async function executeWebsiteAuditAgent(
  req: WebsiteAuditRequest
): Promise<WebsiteAuditResult> {
  // 1. URL Validation
  const rawUrl = req.target_url?.trim();
  if (!rawUrl) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: 'Target URL is required for website audit.',
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Invalid URL '${rawUrl}'. Please provide a valid HTTP or HTTPS URL (e.g. https://kriatech.in).`,
    };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Unsupported protocol '${parsedUrl.protocol}'. Only http and https URLs can be audited.`,
    };
  }

  // 2. Validate Product Claims if user provided notes
  const allUserInputs = [req.product_name, req.sku, req.topic_or_prompt]
    .filter(Boolean)
    .join(' ');

  if (allUserInputs) {
    const claimCheck = validateProductClaims(allUserInputs);
    if (!claimCheck.valid) {
      return {
        success: false,
        execution_mode: 'error',
        model_invoked: false,
        is_simulated: false,
        error: `Input rejected: Unsupported or false claims detected (${claimCheck.forbiddenClaimsFound.join(', ')}). Absolute durability claims such as 'never scratches' and unverified certifications are strictly prohibited.`,
      };
    }
  }

  // 3. Real Web Fetching (Strict Reality Constraint: Never claim URL was scanned if fetch failed)
  let htmlContent = '';
  if (req.mockHtml) {
    htmlContent = req.mockHtml;
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(parsedUrl.toString(), {
        headers: {
          'User-Agent': 'KRIA-Tech-Website-Audit-Bot/1.0 (+https://kriatech.in; on-page audit)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          execution_mode: 'error',
          model_invoked: false,
          is_simulated: false,
          error: `HTTP Fetch Failed: Target URL returned status ${response.status} (${response.statusText}). The URL was not scanned.`,
        };
      }

      htmlContent = await response.text();
    } catch (fetchErr: any) {
      return {
        success: false,
        execution_mode: 'error',
        model_invoked: false,
        is_simulated: false,
        error: `Network Fetch Failed: Could not connect to '${rawUrl}' (${fetchErr.message}). The URL was not scanned.`,
      };
    }
  }

  // 4. Deterministic HTML & Structured Data Inspection
  const inspection: HtmlInspectionResult = inspectHtml(htmlContent, rawUrl);
  const { facts, checks, totalScore } = inspection;

  // Grounding for KRIA product context
  const grounding = resolveProductGrounding({
    sku: req.sku,
    product_name: req.product_name,
    topic_or_prompt: req.topic_or_prompt,
  });

  // 5. Build Grounded Gemini System Instruction
  const systemInstruction = `
You are the official Website UX & On-Page Technical Audit AI Agent for KRIA TECH, a precision acrylic fabrication company located in Hyderabad, India.
Your role is to formulate actionable, evidence-based technical SEO and mobile UX audit reports grounded in measurable HTML and Schema.org facts.

CRITICAL AUDIT & MEASUREMENT CONSTRAINTS:
1. DETERMINISTIC SCORE INTEGRITY:
   - The measurable inspection engine has computed an exact technical score of: ${totalScore}/100.
   - You MUST set "seo_score" to exactly ${totalScore}. Do not invent an arbitrary score (like static 84).
2. EVIDENCE-BASED AUDIT FINDINGS:
   - Extracted HTML Facts:
     * Page Title: "${facts.pageTitle || 'MISSING'}" (${facts.titleLength} chars)
     * Meta Description: "${facts.metaDescription || 'MISSING'}" (${facts.descriptionLength} chars)
     * Canonical URL: "${facts.canonicalUrl || 'MISSING'}"
     * Mobile Viewport: "${facts.viewportContent || 'MISSING'}" (Responsive: ${facts.isMobileResponsive})
     * Headings: <h1> count: ${facts.h1Count} (Text: "${facts.h1Text || 'None'}"), <h2> count: ${facts.h2Count}
     * Images: ${facts.totalImages} total (${facts.imagesMissingAlt} missing alt tags, ${facts.modernImageFormatCount} modern formats)
     * Schema.org JSON-LD: ${facts.jsonLdBlocksCount} block(s) detected. Types: [${facts.detectedSchemaTypes.join(', ')}]
     * Product Schema: ${facts.productSchema.found ? `Found (Offers: ${facts.productSchema.offersFound}, AggregateOffer: ${facts.productSchema.hasAggregateOffer}, Currency: ${facts.productSchema.priceCurrency || 'None'})` : 'NOT FOUND'}
3. FACTORY QUALITY & B2B CONVERSION STANDARDS:
   - Where applicable, recommend Schema.org Product with AggregateOffer for bulk wholesale price tiers.
   - For acrylic products, recommend high-resolution WebP format with alt text detailing 2mm cell-cast acrylic and flush neodymium magnet mounting.
   - Recommend sticky mobile floating CTAs for B2B wholesale inquiries.
4. OUTPUT REQUIREMENT:
   You must respond ONLY with a valid JSON object strictly matching this schema:
   {
     "reasoning_summary": string (minimum 10 characters detailing analysis of measured technical checks),
     "sources": string[] (list of measured HTML checks and guidelines referenced),
     "verified_facts": string[] (minimum 1 item: verified measurable facts from the page HTML),
     "assumptions": string[] (assumptions regarding backend server response time or web server stack),
     "target_url": "${rawUrl}",
     "page_title": "${facts.pageTitle || 'Untitled Document'}",
     "detected_issues": [
       {
         "severity": "low" | "medium" | "high" | "critical",
         "issue": string (specific observed technical defect),
         "fix": string (prescriptive, actionable implementation fix)
       }
     ],
     "seo_score": ${totalScore},
     "mobile_ux_notes": string (actionable mobile performance, touch target, or conversion optimization note)
   }

${PROMPT_INJECTION_DEFENSE}
`.trim();

  const promptParts: string[] = [
    `Perform technical SEO and mobile UX audit synthesis for:`,
    `- Target URL: ${rawUrl}`,
    facts.pageTitle ? `- Page Title: ${facts.pageTitle}` : '- Page Title: MISSING',
    `- Measurable Score: ${totalScore}/100`,
    `- Title Check: ${facts.pageTitle ? `${facts.titleLength} chars` : 'FAIL (Missing)'}`,
    `- Meta Description Check: ${facts.metaDescription ? `${facts.descriptionLength} chars` : 'FAIL (Missing)'}`,
    `- Canonical Tag Check: ${facts.canonicalUrl ? 'PASS' : 'FAIL (Missing)'}`,
    `- Mobile Viewport Check: ${facts.isMobileResponsive ? 'PASS' : 'FAIL (Missing responsive viewport)'}`,
    `- Headings: ${facts.h1Count} <h1> tag(s), ${facts.h2Count} <h2> tag(s)`,
    `- Image Alt Tags: ${facts.imagesMissingAlt} of ${facts.totalImages} missing alt`,
    `- Schema.org Types: ${facts.detectedSchemaTypes.length > 0 ? facts.detectedSchemaTypes.join(', ') : 'None'}`,
    `- Product Schema Offer Status: ${facts.productSchema.found ? (facts.productSchema.hasAggregateOffer ? 'Complete' : 'Missing AggregateOffer') : 'Missing Product Schema'}`,
  ];

  if (inspection.detectedIssues.length > 0) {
    promptParts.push('- Detected Technical Deficiencies:');
    for (const iss of inspection.detectedIssues) {
      promptParts.push(`  * [${iss.severity.toUpperCase()}] ${iss.issue} => Fix: ${iss.fix}`);
    }
  }

  if (req.topic_or_prompt) {
    promptParts.push(`- Audit Focus Notes: ${req.topic_or_prompt}`);
  }

  promptParts.push('Provide structured remediation recommendations and mobile UX enhancement directives based strictly on the measured HTML facts.');

  const userPrompt = promptParts.join('\n');

  // 6. Invoke Real Gemini Model
  let geminiResult;
  try {
    geminiResult = await generateStructuredWithGemini({
      prompt: userPrompt,
      systemInstruction,
      schema: WebsiteAgentOutputSchema,
    });
  } catch (err: any) {
    // Explicit provider error reporting — NEVER silently substitute mock data!
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Gemini AI Website Audit Synthesis Failed: ${err.message}`,
    };
  }

  if (!geminiResult || !geminiResult.data) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: 'Gemini AI Website Audit failed to return structured data.',
    };
  }

  const generated = geminiResult.data;

  // Enforce score consistency with measured checks
  generated.seo_score = totalScore;

  // 7. Database Persistence in Supabase seo_audits table
  let savedAuditId: string | undefined;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (process.env.NODE_ENV === 'test' || (supabaseUrl && !supabaseUrl.includes('placeholder'))) {
      let supabase: any = req.supabaseClient;
      if (!supabase) {
        try {
          supabase = createClient();
        } catch {
          const { createClient: createBrowserClient } = await import('@/lib/supabase/client');
          supabase = createBrowserClient();
        }
      }

      const { data, error } = await supabase
        .from('seo_audits')
        .insert([
          {
            target_url: generated.target_url,
            audit_type: 'on-page',
            issues: generated.detected_issues,
            recommendations: [generated.mobile_ux_notes],
            score: generated.seo_score,
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.warn('Supabase seo_audits insert warning:', error.message);
      } else if (data) {
        savedAuditId = data.id;
      }
    }
  } catch (persistErr: any) {
    console.error('Warning: Failed to persist audit in Supabase seo_audits:', persistErr);
  }

  // 8. Submit Proposed Website Changes to Approval Queue (Human Gate Enforcement)
  let approvalId: string | undefined;
  try {
    const approvalPayload = {
      action_type: 'website_change' as const,
      title: `Proposed SEO & UX Updates: ${generated.page_title} (${generated.target_url})`,
      proposed_content: {
        target_url: generated.target_url,
        page_title: generated.page_title,
        seo_score: generated.seo_score,
        detected_issues: generated.detected_issues,
        mobile_ux_notes: generated.mobile_ux_notes,
        reasoning_summary: generated.reasoning_summary,
        verified_facts: generated.verified_facts,
        sources: generated.sources,
        model_used: geminiResult.model,
      },
      destination: `Live Website Production (${generated.target_url})`,
      agent_id: 'website-agent',
      risk_level: 'high' as const,
      requested_by: req.actor_email || null,
    };

    const approvalRes = req.supabaseClient
      ? await createApprovalRequest(approvalPayload, req.supabaseClient)
      : await createApprovalRequest(approvalPayload);

    if (approvalRes.success && approvalRes.data) {
      approvalId = approvalRes.data.id;
    }
  } catch (approvalErr: any) {
    console.error('Warning: Failed to route website change to Approval Gate:', approvalErr);
  }

  // 9. Log Activity Trail
  await logActivity({
    entity_type: 'seo_audit',
    entity_id: savedAuditId || generated.target_url,
    action: 'website_audited_real_ai',
    description: `Website Audit Agent scanned '${generated.target_url}' (Score: ${generated.seo_score}/100, ${generated.detected_issues.length} issues) using live ${geminiResult.model}`,
    actor_type: 'agent',
    actor_id: 'website-agent',
    metadata: {
      target_url: generated.target_url,
      score: generated.seo_score,
      model: geminiResult.model,
      issues_count: generated.detected_issues.length,
      approval_id: approvalId,
      saved_audit_id: savedAuditId,
    },
  });

  // 10. Return Honest Live AI Metadata
  return {
    success: true,
    execution_mode: 'live_ai',
    model_invoked: true,
    is_simulated: false,
    model_name: geminiResult.model,
    output: generated,
    measured_score: totalScore,
    inspection_checks: checks,
    saved_audit_id: savedAuditId,
    approval_id: approvalId,
    conflicts_detected: grounding.conflicts,
  };
}

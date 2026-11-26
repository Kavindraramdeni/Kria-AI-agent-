import { KRIA_CATALOG_VARIANTS, KRIA_TECH_MANUFACTURING_SPECS } from '@/lib/data/kria-catalog-matrix';
import { KRIA_MANUFACTURING_FACTS } from '@/lib/agents/guardrails';
import { Product } from '@/types/database';

export interface VerifiedProductRecord {
  id?: string;
  sku?: string;
  name?: string;
  category?: string;
  dimensions?: string;
  materials?: string[];
  production_notes?: string;
  verification_status?: 'verified' | 'unverified' | 'draft';
  verification_claims?: {
    clarity?: string;
    magnet_grade?: string;
    material_spec?: string;
    manufacturing_location?: string;
    hardware?: string;
    bundle_type?: string;
    contents?: string;
    shipping?: string;
    limit?: string;
  };
  source: 'database' | 'factory_matrix' | 'mapf_standards' | 'none';
}

export interface ProductConflict {
  field: string;
  verifiedValue: string;
  userClaim: string;
  resolution: string;
}

export interface GroundingResolution {
  product: VerifiedProductRecord | null;
  productName?: string;
  sku?: string;
  dimensions?: string;
  verifiedSpecs: string[];
  userProvidedClaims: string[];
  conflicts: ProductConflict[];
  hasSupportingRecords: boolean;
}

/**
 * Validates against unsupported, absolute, or hallucinated product claims.
 * Requirement 2: Prohibits absolute claims such as "never scratches" or "scratch-proof".
 */
export function validateProductClaims(text: string): { valid: boolean; forbiddenClaimsFound: string[] } {
  const forbiddenPatterns = [
    {
      pattern: /\b(never\s+scratch(es)?|zero\s+scratches|100%\s+scratch-?proof|completely\s+scratch-?proof|scratch-?proof)\b/i,
      name: "unsupported absolute claim ('never scratches' / 'scratch-proof')",
    },
    {
      pattern: /\b(bulletproof|bullet-proof)\b/i,
      name: 'bulletproof',
    },
    {
      pattern: /\b(unbreakable|indestructible|shatter-?proof\s+guarantee)\b/i,
      name: 'unsupported durability claim (unbreakable / indestructible)',
    },
    {
      pattern: /\b(iso[- ]?900[0-9]|iso[- ]?certified)\b/i,
      name: 'unverified ISO certification',
    },
    {
      pattern: /\b(aerospace|military[- ]?grade|titanium[- ]?infused)\b/i,
      name: 'unsupported military/aerospace claim',
    },
    {
      pattern: /\b(lifetime[- ]?warranty|10[- ]?year[- ]?warranty)\b/i,
      name: 'unsupported warranty claim',
    },
    {
      pattern: /\b(ce[- ]?certified|fda[- ]?approved)\b/i,
      name: 'unsupported regulatory certification',
    },
  ];

  const found: string[] = [];
  for (const { pattern, name } of forbiddenPatterns) {
    if (pattern.test(text)) {
      found.push(name);
    }
  }

  return {
    valid: found.length === 0,
    forbiddenClaimsFound: found,
  };
}

/**
 * Resolves a product record from approved factory specification records or database.
 * Requirement 1: Only specifications explicitly marked as verified in records are allowed.
 * Requirement 3: Does NOT automatically treat clarity, polishing, magnets, or location as verified without records.
 * Requirement 5: If a specification is unavailable, it is omitted rather than invented.
 */
export function lookupProductRecord(identifier: {
  sku?: string;
  product_name?: string;
}): VerifiedProductRecord | null {
  const targetSku = identifier.sku?.trim().toUpperCase();
  const targetName = identifier.product_name?.trim().toLowerCase();

  // 1. Check MAPF authoritative manufacturing facts (Factory Standard)
  if (targetSku && KRIA_MANUFACTURING_FACTS.products[targetSku as keyof typeof KRIA_MANUFACTURING_FACTS.products]) {
    const mapf = KRIA_MANUFACTURING_FACTS.products[targetSku as keyof typeof KRIA_MANUFACTURING_FACTS.products];
    return {
      sku: targetSku,
      name: mapf.title,
      category: 'Tabletop Acrylic Photo Blocks',
      dimensions: mapf.thickness,
      materials: [
        'Grade-A imported virgin cast acrylic (20-30mm dual block)',
        'N52 nickel-plated neodymium corner magnets',
      ],
      production_notes: mapf.edge_polish,
      verification_status: 'verified',
      verification_claims: {
        clarity: '92% light transmission (non-yellowing virgin cast acrylic)',
        magnet_grade: 'N52 nickel-plated neodymium corner magnets',
        material_spec: 'Grade-A imported virgin cast acrylic',
      },
      source: 'mapf_standards',
    };
  }

  // 2. Check KRIA Catalog Variants (Approved Specification Records)
  const matchedVariant = KRIA_CATALOG_VARIANTS.find((p) => {
    if (targetSku && p.sku.toUpperCase() === targetSku) return true;
    if (targetName && p.name.toLowerCase() === targetName) return true;
    if (targetName && targetName.length > 5 && p.name.toLowerCase().includes(targetName)) return true;
    return false;
  });

  if (matchedVariant) {
    const customOpts = matchedVariant.customization_options as any;
    const isVerified = customOpts?.verification_status === 'verified';
    const vClaims = customOpts?.verification_claims || {};

    return {
      sku: matchedVariant.sku,
      name: matchedVariant.name,
      category: matchedVariant.category,
      dimensions: matchedVariant.dimensions || undefined,
      materials: matchedVariant.materials,
      production_notes: matchedVariant.production_notes || undefined,
      verification_status: isVerified ? 'verified' : 'unverified',
      verification_claims: isVerified
        ? {
            clarity: vClaims.clarity,
            magnet_grade: vClaims.magnet_grade,
            material_spec: vClaims.material_spec,
            manufacturing_location: vClaims.manufacturing_location,
            hardware: vClaims.hardware,
            bundle_type: vClaims.bundle_type,
            contents: vClaims.contents,
            shipping: vClaims.shipping,
            limit: vClaims.limit,
          }
        : undefined,
      source: 'factory_matrix',
    };
  }

  return null;
}

/**
 * Detects conflicts between user-supplied prompts/claims and verified database records.
 * Requirement 6: Add conflict detection between user claims and verified facts.
 */
export function detectProductConflicts(
  record: VerifiedProductRecord,
  userInputs: {
    dimensions?: string;
    topic_or_prompt?: string;
    target_specs?: string[];
  }
): ProductConflict[] {
  const conflicts: ProductConflict[] = [];
  const promptText = (userInputs.topic_or_prompt || '').toLowerCase();
  const userDimensions = userInputs.dimensions?.toLowerCase() || '';

  // 1. Check Dimensions Mismatch
  if (record.dimensions) {
    const verifiedDimLower = record.dimensions.toLowerCase();

    // Check if user specified explicit dimensions that contradict the record
    if (userDimensions && !verifiedDimLower.includes(userDimensions)) {
      conflicts.push({
        field: 'dimensions',
        verifiedValue: record.dimensions,
        userClaim: userInputs.dimensions!,
        resolution: `Verified factory dimensions (${record.dimensions}) take precedence. Conflicting user dimension rejected.`,
      });
    }

    // Check prompt for obvious dimension contradictions
    if (record.sku?.startsWith('KRA-SQU-0202') && (promptText.includes('8x10') || promptText.includes('6x4') || promptText.includes('5x7'))) {
      conflicts.push({
        field: 'dimensions',
        verifiedValue: '2 × 2 inches',
        userClaim: 'Prompt mentions large frame size (e.g. 8x10 / 6x4)',
        resolution: 'KRA-SQU-0202 is verified as 2x2 inches. Larger dimensions rejected.',
      });
    }

    if (record.sku?.startsWith('MAPF-') && promptText.includes('2mm')) {
      conflicts.push({
        field: 'thickness',
        verifiedValue: record.dimensions,
        userClaim: 'Prompt claims 2mm acrylic',
        resolution: `MAPF photo blocks are 20mm-30mm dual-block frames. 2mm claim rejected.`,
      });
    }
  }

  // 2. Check Magnet Grade / Presence Mismatch
  const recordHasMagnets = Boolean(
    record.verification_claims?.magnet_grade ||
    record.materials?.some((m) => m.toLowerCase().includes('magnet'))
  );

  if (!recordHasMagnets && (promptText.includes('magnetic fridge') || promptText.includes('fridge magnet') || promptText.includes('n35 magnet'))) {
    conflicts.push({
      field: 'magnet_attachment',
      verifiedValue: 'No magnets (keychain / daily accessory hardware)',
      userClaim: 'User prompt requested magnetic fridge attachment',
      resolution: `${record.name || record.sku} has no magnetic hardware. Magnetic claim omitted.`,
    });
  }

  if (record.source === 'mapf_standards' && promptText.includes('n35')) {
    conflicts.push({
      field: 'magnet_grade',
      verifiedValue: 'N52 nickel-plated neodymium magnets',
      userClaim: 'User prompt specified Grade N35 magnet',
      resolution: 'MAPF standards require Grade N52 magnets. N35 claim corrected to N52.',
    });
  }

  if (record.source === 'mapf_standards' && promptText.includes('fridge')) {
    conflicts.push({
      field: 'product_category',
      verifiedValue: 'Free-standing tabletop acrylic block (20-30mm thick)',
      userClaim: 'User prompt claimed fridge magnet',
      resolution: 'MAPF photo blocks are free-standing tabletop desk frames, not fridge magnets.',
    });
  }

  return conflicts;
}

/**
 * Main Grounding Resolution Function:
 * Enforces Requirements 1, 3, 4, and 5.
 */
export function resolveProductGrounding(req: {
  sku?: string;
  product_name?: string;
  dimensions?: string;
  verified_specs?: string[];
  topic_or_prompt?: string;
}): GroundingResolution {
  const record = lookupProductRecord({
    sku: req.sku,
    product_name: req.product_name,
  });

  const verifiedSpecs: string[] = [];
  const userProvidedClaims: string[] = [];
  const conflicts: ProductConflict[] = [];

  // Extract user-supplied marketing claims from prompt
  if (req.topic_or_prompt && req.topic_or_prompt.trim().length > 0) {
    userProvidedClaims.push(req.topic_or_prompt.trim());
  }

  if (record && record.verification_status === 'verified') {
    // 1. Extract ONLY specifications with verified supporting records
    if (record.verification_claims?.material_spec) {
      verifiedSpecs.push(record.verification_claims.material_spec);
    } else if (record.materials && record.materials.length > 0) {
      verifiedSpecs.push(...record.materials);
    }

    if (record.dimensions) {
      verifiedSpecs.push(`Dimensions: ${record.dimensions}`);
    }

    // Optical clarity: ONLY if verified supporting record exists
    if (record.verification_claims?.clarity) {
      verifiedSpecs.push(record.verification_claims.clarity);
    }

    // Magnet specification: ONLY if verified supporting record exists
    if (record.verification_claims?.magnet_grade) {
      verifiedSpecs.push(`Magnet: ${record.verification_claims.magnet_grade}`);
    }

    // Hardware (e.g. keychains): ONLY if verified supporting record exists
    if (record.verification_claims?.hardware) {
      verifiedSpecs.push(`Hardware: ${record.verification_claims.hardware}`);
    }

    // Bundle / starter-kit specifications: ONLY if verified supporting record exists
    if (record.verification_claims?.bundle_type) {
      verifiedSpecs.push(`Bundle Type: ${record.verification_claims.bundle_type}`);
    }
    if (record.verification_claims?.contents) {
      verifiedSpecs.push(`Bundle Contents: ${record.verification_claims.contents}`);
    }
    if (record.verification_claims?.shipping) {
      verifiedSpecs.push(`Shipping: ${record.verification_claims.shipping}`);
    }
    if (record.verification_claims?.limit) {
      verifiedSpecs.push(`Order Limit: ${record.verification_claims.limit}`);
    }

    // Edge finish: ONLY if explicitly in production notes / edge polish record
    if (record.production_notes) {
      if (/diamond/i.test(record.production_notes)) {
        verifiedSpecs.push('Diamond-polished edge finish');
      } else if (/flame/i.test(record.production_notes)) {
        verifiedSpecs.push('Flame-polished edge finish');
      }
    }

    // Manufacturing location: ONLY if verified supporting record exists
    if (record.verification_claims?.manufacturing_location) {
      verifiedSpecs.push(`Manufactured in ${record.verification_claims.manufacturing_location}`);
    }

    // Check for user-supplied conflicts against verified record
    const detectedConflicts = detectProductConflicts(record, {
      dimensions: req.dimensions,
      topic_or_prompt: req.topic_or_prompt,
    });
    conflicts.push(...detectedConflicts);

    return {
      product: record,
      productName: record.name || req.product_name,
      sku: record.sku || req.sku,
      dimensions: record.dimensions || req.dimensions,
      verifiedSpecs,
      userProvidedClaims,
      conflicts,
      hasSupportingRecords: true,
    };
  }

  // If NO supporting record is found (e.g. unknown SKU or generic prompt)
  // Requirement 5: Omit unavailable specifications instead of inventing defaults!
  const hasSupportingRecords = false;

  // Do NOT invent SKU, do NOT invent dimensions, do NOT invent 93% clarity or N35 magnets!
  verifiedSpecs.push('No verified factory specifications on record for this item. Physical and material claims omitted.');

  return {
    product: null,
    productName: req.product_name || undefined,
    sku: req.sku || undefined,
    dimensions: req.dimensions || undefined,
    verifiedSpecs,
    userProvidedClaims,
    conflicts: [],
    hasSupportingRecords,
  };
}

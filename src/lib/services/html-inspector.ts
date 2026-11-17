/**
 * KRIA AI — HTML Inspection, Technical SEO & Structured Data Extraction Engine
 * Provides deterministic, measurable technical audits directly from raw HTML.
 */

export interface MeasurableCheck {
  id: string;
  category: 'metadata' | 'mobile_ux' | 'content_hierarchy' | 'media' | 'structured_data';
  title: string;
  status: 'pass' | 'warning' | 'fail';
  pointsAwarded: number;
  maxPoints: number;
  evidence: string;
  issueDescription?: string;
  recommendedFix?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ExtractedHtmlFacts {
  targetUrl: string;
  pageTitle: string | null;
  titleLength: number;
  metaDescription: string | null;
  descriptionLength: number;
  canonicalUrl: string | null;
  viewportContent: string | null;
  isMobileResponsive: boolean;
  h1Count: number;
  h1Text: string | null;
  h2Count: number;
  totalImages: number;
  imagesMissingAlt: number;
  modernImageFormatCount: number;
  openGraph: {
    title: string | null;
    description: string | null;
    image: string | null;
  };
  jsonLdBlocksCount: number;
  detectedSchemaTypes: string[];
  productSchema: {
    found: boolean;
    name: string | null;
    offersFound: boolean;
    hasAggregateOffer: boolean;
    hasPriceRange: boolean;
    priceCurrency: string | null;
    price: string | number | null;
    sku: string | null;
  };
}

export interface HtmlInspectionResult {
  facts: ExtractedHtmlFacts;
  checks: MeasurableCheck[];
  totalScore: number; // 0 to 100
  detectedIssues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    issue: string;
    fix: string;
  }>;
}

/**
 * Extracts attribute value from an HTML tag string regardless of attribute order or quote style.
 */
export function extractAttribute(tagStr: string, attrName: string): string | null {
  const regex = new RegExp(`(?:^|\\s)${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tagStr.match(regex);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

/**
 * Strips HTML tags and normalizes whitespace from a text snippet.
 */
function cleanText(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Inspects raw HTML string and computes measurable SEO & UX checks and score.
 */
export function inspectHtml(html: string, targetUrl: string): HtmlInspectionResult {
  // 1. Extract Page Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? cleanText(titleMatch[1]) : null;
  const titleLength = pageTitle ? pageTitle.length : 0;

  // 2. Extract Meta Tags
  let metaDescription: string | null = null;
  let viewportContent: string | null = null;
  let ogTitle: string | null = null;
  let ogDesc: string | null = null;
  let ogImage: string | null = null;

  const metaMatches = html.match(/<meta\b[^>]*>/gi) || [];
  for (const metaTag of metaMatches) {
    const name = extractAttribute(metaTag, 'name')?.toLowerCase();
    const property = extractAttribute(metaTag, 'property')?.toLowerCase();
    const content = extractAttribute(metaTag, 'content');

    if (!content) continue;

    if (name === 'description' && !metaDescription) {
      metaDescription = cleanText(content);
    } else if (name === 'viewport' && !viewportContent) {
      viewportContent = content.trim();
    } else if (property === 'og:title' && !ogTitle) {
      ogTitle = cleanText(content);
    } else if (property === 'og:description' && !ogDesc) {
      ogDesc = cleanText(content);
    } else if (property === 'og:image' && !ogImage) {
      ogImage = content.trim();
    }
  }

  const descriptionLength = metaDescription ? metaDescription.length : 0;

  // 3. Extract Canonical URL
  let canonicalUrl: string | null = null;
  const linkMatches = html.match(/<link\b[^>]*>/gi) || [];
  for (const linkTag of linkMatches) {
    const rel = extractAttribute(linkTag, 'rel')?.toLowerCase();
    if (rel === 'canonical') {
      canonicalUrl = extractAttribute(linkTag, 'href');
      break;
    }
  }

  // 4. Mobile Responsiveness Checks
  const isMobileResponsive = Boolean(
    viewportContent &&
    viewportContent.toLowerCase().includes('width=device-width')
  );

  // 5. Heading Structure
  const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h1Count = h1Matches.length;
  const h1Text = h1Matches[0] ? cleanText(h1Matches[0]) : null;

  const h2Matches = html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  const h2Count = h2Matches.length;

  // 6. Image Auditing
  const imgMatches = html.match(/<img\b[^>]*>/gi) || [];
  const totalImages = imgMatches.length;
  let imagesMissingAlt = 0;
  let modernImageFormatCount = 0;

  for (const imgTag of imgMatches) {
    const alt = extractAttribute(imgTag, 'alt');
    if (alt === null || alt.trim() === '') {
      imagesMissingAlt++;
    }

    const src = extractAttribute(imgTag, 'src') || '';
    if (/\.(webp|avif|svg)(\?.*)?$/i.test(src)) {
      modernImageFormatCount++;
    }
  }

  // 7. Structured Data (JSON-LD) Extraction & Validation
  const jsonLdBlocks = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const detectedSchemaTypes: string[] = [];

  const productSchema = {
    found: false,
    name: null as string | null,
    offersFound: false,
    hasAggregateOffer: false,
    hasPriceRange: false,
    priceCurrency: null as string | null,
    price: null as string | number | null,
    sku: null as string | null,
  };

  function processSchemaObject(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(processSchemaObject);
      return;
    }

    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
      obj['@graph'].forEach(processSchemaObject);
      return;
    }

    const rawType = obj['@type'];
    if (rawType) {
      const types = Array.isArray(rawType) ? rawType : [rawType];
      types.forEach((t) => {
        if (typeof t === 'string' && !detectedSchemaTypes.includes(t)) {
          detectedSchemaTypes.push(t);
        }
      });

      if (types.includes('Product')) {
        productSchema.found = true;
        productSchema.name = obj.name || null;
        productSchema.sku = obj.sku || null;

        const offers = obj.offers;
        if (offers) {
          productSchema.offersFound = true;
          const offerList = Array.isArray(offers) ? offers : [offers];
          for (const off of offerList) {
            if (off['@type'] === 'AggregateOffer') {
              productSchema.hasAggregateOffer = true;
              if (off.priceRange || (off.lowPrice && off.highPrice)) {
                productSchema.hasPriceRange = true;
              }
            }
            if (off.priceCurrency) productSchema.priceCurrency = off.priceCurrency;
            if (off.price) productSchema.price = off.price;
          }
        }
      }
    }

    // Traverse nested objects
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        processSchemaObject(obj[key]);
      }
    }
  }

  for (const block of jsonLdBlocks) {
    const jsonMatch = block.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        processSchemaObject(parsed);
      } catch {
        // Corrupt or invalid JSON block
      }
    }
  }

  const facts: ExtractedHtmlFacts = {
    targetUrl,
    pageTitle,
    titleLength,
    metaDescription,
    descriptionLength,
    canonicalUrl,
    viewportContent,
    isMobileResponsive,
    h1Count,
    h1Text,
    h2Count,
    totalImages,
    imagesMissingAlt,
    modernImageFormatCount,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      image: ogImage,
    },
    jsonLdBlocksCount: jsonLdBlocks.length,
    detectedSchemaTypes,
    productSchema,
  };

  // 8. Deterministic Measurable Checks Evaluation (100 Point Rubric)
  const checks: MeasurableCheck[] = [];
  const detectedIssues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    issue: string;
    fix: string;
  }> = [];

  // Check 1: Title Tag (15 pts)
  if (!pageTitle) {
    checks.push({
      id: 'check-title',
      category: 'metadata',
      title: 'HTML Page Title',
      status: 'fail',
      pointsAwarded: 0,
      maxPoints: 15,
      evidence: 'Missing <title> tag in HTML document',
      issueDescription: 'Missing <title> tag in HTML header',
      recommendedFix: 'Add a descriptive <title> tag containing target brand and high-intent keyword between 30 and 65 characters.',
      severity: 'critical',
    });
    detectedIssues.push({
      severity: 'critical',
      issue: 'Missing <title> tag in HTML header.',
      fix: 'Add a descriptive <title> tag between 30 and 65 characters.',
    });
  } else if (titleLength < 30 || titleLength > 65) {
    const isShort = titleLength < 30;
    checks.push({
      id: 'check-title',
      category: 'metadata',
      title: 'HTML Page Title Length',
      status: 'warning',
      pointsAwarded: 12,
      maxPoints: 15,
      evidence: `<title>${pageTitle}</title> (${titleLength} chars)`,
      issueDescription: isShort ? 'Title tag is shorter than recommended 30 characters.' : 'Title tag exceeds 65 characters and may truncate in Google SERPs.',
      recommendedFix: isShort ? 'Expand title to include secondary commercial intent keywords.' : 'Trim title to under 65 characters to avoid SERP truncation.',
      severity: 'low',
    });
    detectedIssues.push({
      severity: 'low',
      issue: isShort ? `Title tag is too short (${titleLength} chars).` : `Title tag is too long (${titleLength} chars).`,
      fix: isShort ? 'Expand title to 30-65 characters with relevant keyword terms.' : 'Shorten title to under 65 characters.',
    });
  } else {
    checks.push({
      id: 'check-title',
      category: 'metadata',
      title: 'HTML Page Title',
      status: 'pass',
      pointsAwarded: 15,
      maxPoints: 15,
      evidence: `<title>${pageTitle}</title> (${titleLength} chars - optimal length)`,
    });
  }

  // Check 2: Meta Description (15 pts)
  if (!metaDescription) {
    checks.push({
      id: 'check-meta-desc',
      category: 'metadata',
      title: 'Meta Description Tag',
      status: 'fail',
      pointsAwarded: 0,
      maxPoints: 15,
      evidence: 'No <meta name="description"> tag found',
      issueDescription: 'Missing meta description tag in page header.',
      recommendedFix: 'Add a compelling meta description between 120 and 160 characters incorporating value proposition and call-to-action.',
      severity: 'high',
    });
    detectedIssues.push({
      severity: 'high',
      issue: 'Missing meta description tag in HTML document.',
      fix: 'Add a compelling meta description between 120 and 160 characters.',
    });
  } else if (descriptionLength < 80 || descriptionLength > 165) {
    const isShort = descriptionLength < 80;
    checks.push({
      id: 'check-meta-desc',
      category: 'metadata',
      title: 'Meta Description Length',
      status: 'warning',
      pointsAwarded: 11,
      maxPoints: 15,
      evidence: `Length: ${descriptionLength} characters`,
      issueDescription: isShort ? 'Meta description is too short to maximize click-through rate.' : 'Meta description exceeds 165 characters and will be clipped by search engines.',
      recommendedFix: isShort ? 'Expand description to 120-160 characters detailing factory quality and wholesale terms.' : 'Trim description to under 160 characters.',
      severity: 'low',
    });
  } else {
    checks.push({
      id: 'check-meta-desc',
      category: 'metadata',
      title: 'Meta Description Tag',
      status: 'pass',
      pointsAwarded: 15,
      maxPoints: 15,
      evidence: `Optimal length (${descriptionLength} chars): "${metaDescription.slice(0, 70)}..."`,
    });
  }

  // Check 3: Canonical Link (10 pts)
  if (!canonicalUrl) {
    checks.push({
      id: 'check-canonical',
      category: 'metadata',
      title: 'Canonical URL Tag',
      status: 'fail',
      pointsAwarded: 0,
      maxPoints: 10,
      evidence: 'No <link rel="canonical"> element found',
      issueDescription: 'Missing canonical URL link element.',
      recommendedFix: `Add <link rel="canonical" href="${targetUrl}"> to prevent duplicate content indexing.`,
      severity: 'medium',
    });
    detectedIssues.push({
      severity: 'medium',
      issue: 'Missing rel="canonical" URL element in document head.',
      fix: `Add self-referencing canonical tag pointing to ${targetUrl}.`,
    });
  } else {
    checks.push({
      id: 'check-canonical',
      category: 'metadata',
      title: 'Canonical URL Tag',
      status: 'pass',
      pointsAwarded: 10,
      maxPoints: 10,
      evidence: `<link rel="canonical" href="${canonicalUrl}">`,
    });
  }

  // Check 4: Mobile Viewport & Responsiveness (15 pts)
  if (!isMobileResponsive) {
    checks.push({
      id: 'check-viewport',
      category: 'mobile_ux',
      title: 'Mobile Viewport Configuration',
      status: 'fail',
      pointsAwarded: 0,
      maxPoints: 15,
      evidence: viewportContent ? `Invalid viewport: "${viewportContent}"` : 'Missing viewport meta tag',
      issueDescription: 'Page lacks standard mobile responsive viewport tag (width=device-width).',
      recommendedFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to <head>.',
      severity: 'critical',
    });
    detectedIssues.push({
      severity: 'critical',
      issue: 'Missing standard mobile responsive viewport tag.',
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> in head.',
    });
  } else {
    checks.push({
      id: 'check-viewport',
      category: 'mobile_ux',
      title: 'Mobile Viewport Configuration',
      status: 'pass',
      pointsAwarded: 15,
      maxPoints: 15,
      evidence: `<meta name="viewport" content="${viewportContent}">`,
    });
  }

  // Check 5: Heading Structure / H1 (10 pts)
  if (h1Count === 0) {
    checks.push({
      id: 'check-h1',
      category: 'content_hierarchy',
      title: 'Primary <h1> Heading',
      status: 'fail',
      pointsAwarded: 0,
      maxPoints: 10,
      evidence: '0 <h1> tags found in document body',
      issueDescription: 'Missing primary <h1> heading tag.',
      recommendedFix: 'Add a single top-level <h1> tag defining the product or category focus.',
      severity: 'high',
    });
    detectedIssues.push({
      severity: 'high',
      issue: 'Missing primary <h1> heading in document.',
      fix: 'Wrap the primary product/service title in a single semantic <h1> tag.',
    });
  } else if (h1Count > 1) {
    checks.push({
      id: 'check-h1',
      category: 'content_hierarchy',
      title: 'Primary <h1> Heading Count',
      status: 'warning',
      pointsAwarded: 5,
      maxPoints: 10,
      evidence: `${h1Count} <h1> tags detected on page`,
      issueDescription: 'Multiple <h1> tags detected; confuses search engine hierarchy.',
      recommendedFix: 'Retain one primary <h1> for page title and downgrade secondary headings to <h2>.',
      severity: 'medium',
    });
    detectedIssues.push({
      severity: 'medium',
      issue: `Multiple (${h1Count}) <h1> tags detected on page.`,
      fix: 'Use exactly one <h1> for page title and use <h2> for sub-sections.',
    });
  } else {
    checks.push({
      id: 'check-h1',
      category: 'content_hierarchy',
      title: 'Primary <h1> Heading',
      status: 'pass',
      pointsAwarded: 10,
      maxPoints: 10,
      evidence: `Single <h1>: "${h1Text?.slice(0, 60)}"`,
    });
  }

  // Check 6: Image Alt Attributes & Media Optimization (15 pts)
  if (totalImages === 0) {
    checks.push({
      id: 'check-images',
      category: 'media',
      title: 'Image Alt Text Accessibility',
      status: 'pass',
      pointsAwarded: 15,
      maxPoints: 15,
      evidence: 'No images present on page',
    });
  } else {
    const altRatio = (totalImages - imagesMissingAlt) / totalImages;
    const points = Math.round(15 * altRatio);
    if (imagesMissingAlt > 0) {
      checks.push({
        id: 'check-images',
        category: 'media',
        title: 'Image Alt Text Accessibility',
        status: points < 8 ? 'fail' : 'warning',
        pointsAwarded: points,
        maxPoints: 15,
        evidence: `${imagesMissingAlt} of ${totalImages} image(s) missing alt attribute`,
        issueDescription: `Missing alt attributes on ${imagesMissingAlt} image(s).`,
        recommendedFix: 'Add descriptive alt text to all product photography explaining acrylic specs and magnet placement.',
        severity: 'medium',
      });
      detectedIssues.push({
        severity: 'medium',
        issue: `Missing alt attributes on ${imagesMissingAlt} image(s).`,
        fix: 'Add descriptive, keyword-rich alt text to all product photography.',
      });
    } else {
      checks.push({
        id: 'check-images',
        category: 'media',
        title: 'Image Alt Text Accessibility',
        status: 'pass',
        pointsAwarded: 15,
        maxPoints: 15,
        evidence: `All ${totalImages} image(s) include descriptive alt text`,
      });
    }
  }

  // Check 7: Schema.org JSON-LD Structured Data & Product Offer Tiers (20 pts)
  if (jsonLdBlocks.length === 0) {
    checks.push({
      id: 'check-schema',
      category: 'structured_data',
      title: 'Schema.org JSON-LD Structured Data',
      status: 'fail',
      pointsAwarded: 0,
      maxPoints: 20,
      evidence: 'No JSON-LD structured data blocks found in page HTML',
      issueDescription: 'Missing Schema.org JSON-LD markup.',
      recommendedFix: 'Add Schema.org Product markup with AggregateOffer detailing wholesale volume pricing tiers.',
      severity: 'high',
    });
    detectedIssues.push({
      severity: 'high',
      issue: 'Missing Product Schema markup for wholesale bulk pricing tiers.',
      fix: 'Add Schema.org Product and AggregateOffer with priceRange specification.',
    });
  } else if (!productSchema.found) {
    checks.push({
      id: 'check-schema',
      category: 'structured_data',
      title: 'Schema.org Product & Pricing Schema',
      status: 'warning',
      pointsAwarded: 10,
      maxPoints: 20,
      evidence: `Found Schema types: ${detectedSchemaTypes.join(', ')} (Product schema absent)`,
      issueDescription: 'Page contains Schema markup but lacks Product or Offer entities.',
      recommendedFix: 'Add Schema.org Product entity with PriceSpecification and wholesale MOQ.',
      severity: 'medium',
    });
    detectedIssues.push({
      severity: 'medium',
      issue: 'Missing Product Schema markup on product landing page.',
      fix: 'Implement Schema.org Product markup with offers and manufacturer details.',
    });
  } else if (!productSchema.hasAggregateOffer) {
    checks.push({
      id: 'check-schema',
      category: 'structured_data',
      title: 'Wholesale Tier AggregateOffer Schema',
      status: 'warning',
      pointsAwarded: 15,
      maxPoints: 20,
      evidence: 'Product schema found with standard Offer, but lacks AggregateOffer for wholesale tiers',
      issueDescription: 'Product Schema lacks AggregateOffer or priceRange for B2B wholesale pricing tiers.',
      recommendedFix: 'Add Schema.org AggregateOffer with priceRange and volume tier priceSpecification.',
      severity: 'medium',
    });
    detectedIssues.push({
      severity: 'medium',
      issue: 'Product Schema lacks AggregateOffer for wholesale bulk pricing tiers.',
      fix: 'Add Schema.org AggregateOffer with priceRange specification to highlight volume savings in Google SERPs.',
    });
  } else {
    checks.push({
      id: 'check-schema',
      category: 'structured_data',
      title: 'Schema.org Product & AggregateOffer Schema',
      status: 'pass',
      pointsAwarded: 20,
      maxPoints: 20,
      evidence: `Product schema verified with AggregateOffer (Currency: ${productSchema.priceCurrency || 'INR'})`,
    });
  }

  // Calculate Total Score
  const totalScore = Math.max(
    0,
    Math.min(
      100,
      checks.reduce((acc, c) => acc + c.pointsAwarded, 0)
    )
  );

  return {
    facts,
    checks,
    totalScore,
    detectedIssues,
  };
}

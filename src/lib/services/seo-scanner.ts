/**
 * KRIA AI — Comprehensive Website SEO Scanner, DOM Inspector & Core Web Vitals Engine (Phase 3)
 * Evaluates live URL network diagnostics, DOM health, render-blocking assets, CLS risks,
 * Schema.org Rich Results compliance, and mathematical multi-category scores.
 */

import { extractAttribute } from '@/lib/services/html-inspector';
import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { PROMPT_INJECTION_DEFENSE } from '@/lib/agents/guardrails';
import { createClient } from '@/lib/supabase/server';
import { createApprovalRequest } from '@/lib/services/approvals';
import { logActivity } from '@/lib/services/activity-logs';
import { z } from 'zod';
import net from 'net';

export interface NetworkDiagnostics {
  url: string;
  finalUrl: string;
  statusCode: number;
  statusText: string;
  redirectCount: number;
  ttfbMs: number;
  contentLengthBytes: number;
  payloadSizeKb: number;
  contentType: string | null;
  contentEncoding: string | null;
  isCompressed: boolean;
  cacheControl: string | null;
  securityHeaders: {
    strictTransportSecurity: boolean;
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    contentSecurityPolicy: boolean;
  };
}

export interface DomHealthDetails {
  title: {
    value: string | null;
    length: number;
    status: 'optimal' | 'short' | 'long' | 'missing';
  };
  metaDescription: {
    value: string | null;
    length: number;
    status: 'optimal' | 'short' | 'long' | 'missing';
  };
  canonical: {
    value: string | null;
    isSelfReferencing: boolean;
    status: 'valid' | 'missing' | 'mismatch';
  };
  robots: {
    value: string | null;
    isNoIndex: boolean;
    isNoFollow: boolean;
  };
  openGraph: {
    hasTitle: boolean;
    hasDescription: boolean;
    hasImage: boolean;
    title: string | null;
    image: string | null;
  };
  twitterCard: {
    hasCard: boolean;
    cardType: string | null;
  };
  headings: {
    h1Count: number;
    h1Text: string | null;
    h2Count: number;
    h3Count: number;
    hierarchyJumpsDetected: boolean;
    details: string[];
  };
  semanticHtml: {
    hasHeader: boolean;
    hasNav: boolean;
    hasMain: boolean;
    hasFooter: boolean;
  };
  links: {
    total: number;
    internal: number;
    external: number;
    emptyOrHash: number;
    externalWithoutNoopener: number;
  };
  images: {
    total: number;
    missingAlt: number;
    missingDimensions: number; // CLS risk!
    modernFormats: number; // webp, avif, svg
  };
}

export interface CoreWebVitalsDiagnostics {
  // Measured Network & DOM Metrics
  ttfbMs: number;
  measuredTtfbMs: number;
  ttfbRating: 'good' | 'needs-improvement' | 'poor';
  renderBlockingScriptsCount: number;
  renderBlockingStylesheetsCount: number;
  clsRiskImagesCount: number;
  domElementsCount: number;
  isDomBloated: boolean;

  // Static Heuristic Risk Indicators (Server-side static estimations, NOT real browser measurements)
  estimatedLcpMs: number;
  estimatedLcpHeuristicMs: number;
  estimatedLcpRating: 'good' | 'needs-improvement' | 'poor';
  estimatedClsScore: number;
  estimatedClsHazardScore: number;
  estimatedClsRating: 'good' | 'needs-improvement' | 'poor';

  // RUM / Real Browser Field Data Notice
  inpStatus: 'requires_field_data_or_rum';
  methodology: 'server_side_static_heuristic';
}

export interface SchemaValidationDetails {
  jsonLdBlocksCount: number;
  detectedTypes: string[];
  productSchema: {
    found: boolean;
    name: string | null;
    sku: string | null;
    hasOffers: boolean;
    hasAggregateOffer: boolean;
    hasPriceRange: boolean;
    priceCurrency: string | null;
    price: string | number | null;
    googleRichResultsEligible: boolean;
    missingRecommendedFields: string[];
  };
  organizationSchema: {
    found: boolean;
    name: string | null;
    hasLogo: boolean;
  };
}

export interface ScanIssue {
  category: 'seo' | 'performance' | 'mobile_ux' | 'schema';
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  impact: string;
  fix: string;
  codeSnippet?: string;
}

export interface SeoScanResult {
  url: string;
  timestamp: string;
  executionMode: 'live_network' | 'mock';
  scores: {
    overall: number; // 0-100
    seoHealth: number; // 0-100
    performance: number; // 0-100
    mobileUx: number; // 0-100
    structuredData: number; // 0-100
  };
  network: NetworkDiagnostics;
  dom: DomHealthDetails;
  coreWebVitals: CoreWebVitalsDiagnostics;
  schema: SchemaValidationDetails;
  issues: ScanIssue[];
  aiRemediation?: {
    summary: string;
    topPriorities: string[];
    mobileActionDirective: string;
    modelName: string;
  };
  savedAuditId?: string;
  approvalId?: string;
}

export interface SeoScanOptions {
  url: string;
  mockHtml?: string;
  mockHeaders?: Record<string, string>;
  actorEmail?: string;
  supabaseClient?: any;
}

const AiRemediationSchema = z.object({
  summary: z.string().min(10),
  topPriorities: z.array(z.string()).min(1),
  mobileActionDirective: z.string(),
  sources: z.array(z.string()).default([]),
  verified_facts: z.array(z.string()).default([]),
});

/**
 * Strips HTML tags and normalizes whitespace.
 */
function cleanText(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * SSRF Protection: Checks if an IPv4 or IPv6 address is private, loopback, link-local, or cloud metadata.
 */
export function isPrivateOrRestrictedIp(rawIp: string): boolean {
  let ip = rawIp.trim();

  // Normalize IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (ip.toLowerCase().startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  const ipFamily = net.isIP(ip);
  if (ipFamily === 0) {
    return false; // Not an IP address (e.g. hostname like example.com)
  }

  // IPv4 Checks
  if (ipFamily === 4) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Malformed IPv4 treated as restricted
    }

    const [a, b] = parts;
    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (a === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 255.255.255.255 (Broadcast)
    if (ip === '255.255.255.255') return true;

    return false;
  }

  // IPv6 Checks
  if (ipFamily === 6) {
    const normalized = ip.toLowerCase();
    // Loopback (::1)
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // Unspecified (::)
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
    // Unique local / private (fc00::/7 -> starts with fc or fd)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // Link-local (fe80::/10 -> starts with fe8, fe9, fea, feb)
    if (/^fe[89ab]/i.test(normalized)) return true;

    return false;
  }

  return false;
}

/**
 * SSRF Protection: Checks if hostname is a local domain, cloud metadata, or internal alias.
 */
export function isRestrictedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().trim();
  if (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h.endsWith('.corp') ||
    h.endsWith('.test') ||
    h === 'metadata.google.internal' ||
    h === 'instance-data' ||
    h === 'metadata'
  ) {
    return true;
  }
  return false;
}

/**
 * Validates destination URL and resolves DNS to strictly block SSRF attacks.
 */
export async function validateUrlForSsrf(urlString: string): Promise<URL> {
  const raw = urlString.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(raw);
  } catch {
    throw new Error(`Invalid URL '${raw}'. Please provide a valid HTTP or HTTPS URL.`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported protocol '${parsedUrl.protocol}'. Only http and https URLs can be scanned.`);
  }

  if (!parsedUrl.hostname || parsedUrl.hostname.trim() === '') {
    throw new Error(`Invalid URL: Missing hostname.`);
  }

  if (isRestrictedHostname(parsedUrl.hostname)) {
    throw new Error(`SSRF Security Rejection: Host '${parsedUrl.hostname}' is a restricted local or cloud metadata domain.`);
  }

  if (net.isIP(parsedUrl.hostname) && isPrivateOrRestrictedIp(parsedUrl.hostname)) {
    throw new Error(`SSRF Security Rejection: Host '${parsedUrl.hostname}' is a private or restricted network IP address.`);
  }

  // Allow test mocks to skip real DNS lookup in test environment
  if (
    process.env.NODE_ENV === 'test' &&
    (parsedUrl.hostname === 'kriatech.com' ||
      parsedUrl.hostname === 'example.com' ||
      parsedUrl.hostname === 'invalid-domain.xyz')
  ) {
    return parsedUrl;
  }

  // Resolve DNS to verify IP destinations
  try {
    const dns = await import('dns');
    const addresses = await dns.promises.lookup(parsedUrl.hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateOrRestrictedIp(addr.address)) {
        throw new Error(
          `SSRF Security Rejection: Host '${parsedUrl.hostname}' resolves to restricted IP address (${addr.address}). Scanning private or internal networks is blocked.`
        );
      }
    }
  } catch (err: any) {
    if (err.message?.includes('SSRF Security Rejection')) throw err;
    throw new Error(`DNS Resolution Error: Could not resolve hostname '${parsedUrl.hostname}' (${err.message}).`);
  }

  return parsedUrl;
}

/**
 * Performs a comprehensive technical SEO, DOM, Core Web Vitals, and Schema Rich Result scan.
 */
export async function performComprehensiveSeoScan(
  options: SeoScanOptions
): Promise<SeoScanResult> {
  const rawUrl = options.url.trim();

  // 1. Initial SSRF & Protocol Validation
  let parsedUrl = await validateUrlForSsrf(rawUrl);

  // 2. Disable mock input outside test environments
  if (options.mockHtml && process.env.NODE_ENV !== 'test') {
    options.mockHtml = undefined;
    options.mockHeaders = undefined;
  }

  // 3. Live Network Fetch & Multi-Hop Redirect Validation
  let htmlContent = '';
  let statusCode = 200;
  let statusText = 'OK';
  let ttfbMs = 45;
  let finalUrl = parsedUrl.toString();
  let headers: Record<string, string> = options.mockHeaders || {};
  let executionMode: 'live_network' | 'mock' = 'live_network';

  if (options.mockHtml && process.env.NODE_ENV === 'test') {
    htmlContent = options.mockHtml;
    executionMode = 'mock';
    ttfbMs = 42;
  } else {
    let currentUrl = parsedUrl.toString();
    let redirectCount = 0;
    const maxRedirects = 5;

    while (redirectCount <= maxRedirects) {
      // Re-validate every redirect hop against SSRF, private IPs, and metadata targets!
      parsedUrl = await validateUrlForSsrf(currentUrl);

      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s strict timeout

      try {
        const response = await fetch(currentUrl, {
          redirect: 'manual', // Strictly manual so we can inspect and validate the Location header
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KRIA-Tech-SEO-Scanner/2.0 (+https://kriatech.com; scanner)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Record TTFB on initial hop
        if (redirectCount === 0) {
          ttfbMs = Date.now() - startTime;
        }

        // Check if redirect response (301, 302, 303, 307, 308)
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            throw new Error(`HTTP Redirect Error: Server returned status ${response.status} redirect without Location header.`);
          }
          redirectCount++;
          if (redirectCount > maxRedirects) {
            throw new Error(`Redirect Loop Detected: Exceeded maximum allowed redirects (${maxRedirects}).`);
          }
          // Resolve relative or absolute redirect destination
          const nextUrl = new URL(location, currentUrl);
          currentUrl = nextUrl.toString();
          continue;
        }

        statusCode = response.status;
        statusText = response.statusText;
        finalUrl = currentUrl;

        response.headers.forEach((val, key) => {
          headers[key.toLowerCase()] = val;
        });

        if (!response.ok) {
          throw new Error(`HTTP Fetch Failed: Target URL returned status ${statusCode} (${statusText}). The page was not scanned.`);
        }

        // Enforce maximum response size limit (5 MB)
        const contentLengthHeader = response.headers.get('content-length');
        if (contentLengthHeader && parseInt(contentLengthHeader, 10) > 5 * 1024 * 1024) {
          throw new Error(`Response Size Exceeded: Target page size exceeds 5 MB limit (${contentLengthHeader} bytes).`);
        }

        htmlContent = await response.text();
        if (htmlContent.length > 5 * 1024 * 1024) {
          throw new Error(`Response Size Exceeded: Downloaded HTML exceeds 5 MB maximum limit.`);
        }

        break;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error(`Network Scan Timeout: Connection to '${currentUrl}' timed out after 10 seconds.`);
        }
        if (
          err.message?.includes('HTTP Fetch Failed') ||
          err.message?.includes('SSRF Security Rejection') ||
          err.message?.includes('Response Size Exceeded') ||
          err.message?.includes('Redirect Loop')
        ) {
          throw err;
        }
        throw new Error(`Network Scan Error: Failed to connect to '${currentUrl}' (${err.message}). The page was not scanned.`);
      }
    }
  }

  // 3. Network Metrics Evaluation
  const contentLengthBytes = htmlContent.length;
  const payloadSizeKb = Math.round((contentLengthBytes / 1024) * 10) / 10;
  const contentType = headers['content-type'] || 'text/html';
  const contentEncoding = headers['content-encoding'] || null;
  const isCompressed = Boolean(contentEncoding && /(gzip|br|deflate)/i.test(contentEncoding));
  const cacheControl = headers['cache-control'] || null;

  const securityHeaders = {
    strictTransportSecurity: Boolean(headers['strict-transport-security']),
    xContentTypeOptions: Boolean(headers['x-content-type-options']),
    xFrameOptions: Boolean(headers['x-frame-options']),
    contentSecurityPolicy: Boolean(headers['content-security-policy']),
  };

  const network: NetworkDiagnostics = {
    url: rawUrl,
    finalUrl,
    statusCode,
    statusText,
    redirectCount: finalUrl !== parsedUrl.toString() ? 1 : 0,
    ttfbMs,
    contentLengthBytes,
    payloadSizeKb,
    contentType,
    contentEncoding,
    isCompressed,
    cacheControl,
    securityHeaders,
  };

  // 4. Deep DOM Parsing
  // Title
  const titleMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleVal = titleMatch ? cleanText(titleMatch[1]) : null;
  const titleLen = titleVal ? titleVal.length : 0;
  const titleStatus: 'optimal' | 'short' | 'long' | 'missing' = !titleVal
    ? 'missing'
    : titleLen < 30
    ? 'short'
    : titleLen > 65
    ? 'long'
    : 'optimal';

  // Meta Tags
  let metaDescVal: string | null = null;
  let viewportVal: string | null = null;
  let robotsVal: string | null = null;
  let ogTitleVal: string | null = null;
  let ogDescVal: string | null = null;
  let ogImageVal: string | null = null;
  let twitterCardVal: string | null = null;

  const metaTags = htmlContent.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const name = extractAttribute(tag, 'name')?.toLowerCase();
    const prop = extractAttribute(tag, 'property')?.toLowerCase();
    const content = extractAttribute(tag, 'content');

    if (!content) continue;

    if (name === 'description' && !metaDescVal) metaDescVal = cleanText(content);
    if (name === 'viewport' && !viewportVal) viewportVal = content.trim();
    if (name === 'robots' && !robotsVal) robotsVal = content.toLowerCase();
    if (prop === 'og:title' && !ogTitleVal) ogTitleVal = cleanText(content);
    if (prop === 'og:description' && !ogDescVal) ogDescVal = cleanText(content);
    if (prop === 'og:image' && !ogImageVal) ogImageVal = content.trim();
    if (name === 'twitter:card' && !twitterCardVal) twitterCardVal = content.trim();
  }

  const descLen = metaDescVal ? metaDescVal.length : 0;
  const descStatus: 'optimal' | 'short' | 'long' | 'missing' = !metaDescVal
    ? 'missing'
    : descLen < 80
    ? 'short'
    : descLen > 165
    ? 'long'
    : 'optimal';

  // Canonical
  let canonicalVal: string | null = null;
  const linkTags = htmlContent.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    const rel = extractAttribute(tag, 'rel')?.toLowerCase();
    if (rel === 'canonical') {
      canonicalVal = extractAttribute(tag, 'href');
      break;
    }
  }

  const canonicalStatus: 'valid' | 'missing' | 'mismatch' = !canonicalVal
    ? 'missing'
    : canonicalVal.toLowerCase() === finalUrl.toLowerCase() || canonicalVal === '/'
    ? 'valid'
    : 'mismatch';

  // Robots
  const isNoIndex = Boolean(robotsVal && robotsVal.includes('noindex'));
  const isNoFollow = Boolean(robotsVal && robotsVal.includes('nofollow'));

  // Headings & Hierarchy Jumps
  const h1Matches = htmlContent.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const h2Matches = htmlContent.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi) || [];
  const h3Matches = htmlContent.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi) || [];

  // Check if document has h1 and h3 but zero h2 (hierarchy jump)
  const hierarchyJumpsDetected = h1Matches.length > 0 && h3Matches.length > 0 && h2Matches.length === 0;

  // Semantic HTML5
  const hasHeader = /<header\b[^>]*>/i.test(htmlContent);
  const hasNav = /<nav\b[^>]*>/i.test(htmlContent);
  const hasMain = /<main\b[^>]*>/i.test(htmlContent);
  const hasFooter = /<footer\b[^>]*>/i.test(htmlContent);

  // Link Architecture
  const anchorTags = htmlContent.match(/<a\b[^>]*>/gi) || [];
  let internalLinks = 0;
  let externalLinks = 0;
  let emptyOrHash = 0;
  let externalWithoutNoopener = 0;

  for (const a of anchorTags) {
    const href = extractAttribute(a, 'href');
    if (!href || href === '#' || href.startsWith('javascript:')) {
      emptyOrHash++;
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      try {
        const u = new URL(href);
        if (u.hostname === parsedUrl.hostname) {
          internalLinks++;
        } else {
          externalLinks++;
          const rel = extractAttribute(a, 'rel') || '';
          if (!rel.includes('noopener')) {
            externalWithoutNoopener++;
          }
        }
      } catch {
        internalLinks++;
      }
    } else {
      internalLinks++;
    }
  }

  // Image & CLS Auditing
  const imgTags = htmlContent.match(/<img\b[^>]*>/gi) || [];
  let missingAlt = 0;
  let missingDimensions = 0;
  let modernFormats = 0;

  for (const img of imgTags) {
    const alt = extractAttribute(img, 'alt');
    if (alt === null || alt.trim() === '') missingAlt++;

    const width = extractAttribute(img, 'width');
    const height = extractAttribute(img, 'height');
    if (!width || !height) {
      missingDimensions++; // CLS risk!
    }

    const src = extractAttribute(img, 'src') || '';
    if (/\.(webp|avif|svg)(\?.*)?$/i.test(src)) {
      modernFormats++;
    }
  }

  const dom: DomHealthDetails = {
    title: {
      value: titleVal,
      length: titleLen,
      status: titleStatus,
    },
    metaDescription: {
      value: metaDescVal,
      length: descLen,
      status: descStatus,
    },
    canonical: {
      value: canonicalVal,
      isSelfReferencing: canonicalStatus === 'valid',
      status: canonicalStatus,
    },
    robots: {
      value: robotsVal,
      isNoIndex,
      isNoFollow,
    },
    openGraph: {
      hasTitle: Boolean(ogTitleVal),
      hasDescription: Boolean(ogDescVal),
      hasImage: Boolean(ogImageVal),
      title: ogTitleVal,
      image: ogImageVal,
    },
    twitterCard: {
      hasCard: Boolean(twitterCardVal),
      cardType: twitterCardVal,
    },
    headings: {
      h1Count: h1Matches.length,
      h1Text: h1Matches[0] ? cleanText(h1Matches[0]) : null,
      h2Count: h2Matches.length,
      h3Count: h3Matches.length,
      hierarchyJumpsDetected,
      details: [
        `H1: ${h1Matches.length}`,
        `H2: ${h2Matches.length}`,
        `H3: ${h3Matches.length}`,
      ],
    },
    semanticHtml: {
      hasHeader,
      hasNav,
      hasMain,
      hasFooter,
    },
    links: {
      total: anchorTags.length,
      internal: internalLinks,
      external: externalLinks,
      emptyOrHash,
      externalWithoutNoopener,
    },
    images: {
      total: imgTags.length,
      missingAlt,
      missingDimensions,
      modernFormats,
    },
  };

  // 5. Core Web Vitals & Performance Diagnostics
  // Detect render-blocking resources in <head>
  const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch ? headMatch[1] : '';

  const headScripts = headContent.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
  let renderBlockingScriptsCount = 0;
  for (const s of headScripts) {
    // If script has a src and lacks async or defer, it is render-blocking
    const hasSrc = extractAttribute(s, 'src');
    const isAsync = /\basync\b/i.test(s);
    const isDefer = /\bdefer\b/i.test(s);
    const isModule = /type=["']module["']/i.test(s);
    if (hasSrc && !isAsync && !isDefer && !isModule) {
      renderBlockingScriptsCount++;
    }
  }

  const headStyles = headContent.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
  const renderBlockingStylesheetsCount = headStyles.length;

  const ttfbRating: 'good' | 'needs-improvement' | 'poor' =
    ttfbMs < 200 ? 'good' : ttfbMs < 600 ? 'needs-improvement' : 'poor';

  // Estimated LCP based on TTFB, render-blocking assets, and image dimensions
  const estimatedLcpMs = Math.round(
    ttfbMs +
      renderBlockingScriptsCount * 180 +
      renderBlockingStylesheetsCount * 120 +
      (dom.images.total > 0 && dom.images.modernFormats === 0 ? 350 : 150)
  );

  const estimatedLcpRating: 'good' | 'needs-improvement' | 'poor' =
    estimatedLcpMs < 2500 ? 'good' : estimatedLcpMs < 4000 ? 'needs-improvement' : 'poor';

  // CLS Score estimate: 0.00 for no un-dimensioned images, scaling up with missing dimensions
  const estimatedClsScore =
    imgTags.length > 0
      ? Math.round((missingDimensions / imgTags.length) * 0.18 * 100) / 100
      : 0.0;

  const estimatedClsRating: 'good' | 'needs-improvement' | 'poor' =
    estimatedClsScore < 0.1 ? 'good' : estimatedClsScore < 0.25 ? 'needs-improvement' : 'poor';

  // DOM Elements count estimate
  const domElementsCount = (htmlContent.match(/<[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/g) || []).length;
  const isDomBloated = domElementsCount > 1500;

  const coreWebVitals: CoreWebVitalsDiagnostics = {
    ttfbMs,
    measuredTtfbMs: ttfbMs,
    ttfbRating,
    renderBlockingScriptsCount,
    renderBlockingStylesheetsCount,
    clsRiskImagesCount: missingDimensions,
    estimatedLcpMs,
    estimatedLcpHeuristicMs: estimatedLcpMs,
    estimatedLcpRating,
    estimatedClsScore,
    estimatedClsHazardScore: estimatedClsScore,
    estimatedClsRating,
    domElementsCount,
    isDomBloated,
    inpStatus: 'requires_field_data_or_rum',
    methodology: 'server_side_static_heuristic',
  };

  // 6. Schema.org JSON-LD & Rich Results Validation
  const jsonLdBlocks = htmlContent.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const detectedTypes: string[] = [];

  const productSchema = {
    found: false,
    name: null as string | null,
    sku: null as string | null,
    hasOffers: false,
    hasAggregateOffer: false,
    hasPriceRange: false,
    priceCurrency: null as string | null,
    price: null as string | number | null,
    googleRichResultsEligible: false,
    missingRecommendedFields: [] as string[],
  };

  const organizationSchema = {
    found: false,
    name: null as string | null,
    hasLogo: false,
  };

  function parseSchemaTree(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(parseSchemaTree);
      return;
    }
    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
      obj['@graph'].forEach(parseSchemaTree);
      return;
    }

    const type = obj['@type'];
    if (type) {
      const types = Array.isArray(type) ? type : [type];
      types.forEach((t) => {
        if (typeof t === 'string' && !detectedTypes.includes(t)) {
          detectedTypes.push(t);
        }
      });

      if (types.includes('Product')) {
        productSchema.found = true;
        productSchema.name = obj.name || null;
        productSchema.sku = obj.sku || null;

        const missing: string[] = [];
        if (!obj.image) missing.push('image');
        if (!obj.description) missing.push('description');
        if (!obj.sku) missing.push('sku');
        if (!obj.brand) missing.push('brand');
        if (!obj.aggregateRating) missing.push('aggregateRating');

        const offers = obj.offers;
        if (offers) {
          productSchema.hasOffers = true;
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
        } else {
          missing.push('offers');
        }

        productSchema.missingRecommendedFields = missing;
        productSchema.googleRichResultsEligible = Boolean(obj.name && obj.image && productSchema.hasOffers);
      }

      if (types.includes('Organization') || types.includes('LocalBusiness')) {
        organizationSchema.found = true;
        organizationSchema.name = obj.name || null;
        organizationSchema.hasLogo = Boolean(obj.logo);
      }
    }

    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === 'object' && obj[k] !== null) {
        parseSchemaTree(obj[k]);
      }
    }
  }

  for (const block of jsonLdBlocks) {
    const jsonMatch = block.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        parseSchemaTree(parsed);
      } catch {
        // Syntax error in JSON-LD
      }
    }
  }

  const schema: SchemaValidationDetails = {
    jsonLdBlocksCount: jsonLdBlocks.length,
    detectedTypes,
    productSchema,
    organizationSchema,
  };

  // 7. Multi-Category Score Calculations & Issue Generation
  const issues: ScanIssue[] = [];

  // Category A: SEO Health (Max 100)
  let seoHealthScore = 0;
  if (dom.title.status === 'optimal') seoHealthScore += 20;
  else if (dom.title.status === 'short' || dom.title.status === 'long') seoHealthScore += 12;
  else {
    issues.push({
      category: 'seo',
      severity: 'critical',
      issue: 'Missing <title> tag in HTML document',
      impact: 'Search engines cannot identify primary page theme or display proper SERP heading.',
      fix: 'Add a descriptive <title> tag between 30 and 65 characters with primary target keywords.',
      codeSnippet: `<title>Acrylic Photo Frames & Magnetic Keepsakes | KRIA TECH</title>`,
    });
  }

  if (dom.metaDescription.status === 'optimal') seoHealthScore += 20;
  else if (dom.metaDescription.status === 'short' || dom.metaDescription.status === 'long') seoHealthScore += 12;
  else {
    issues.push({
      category: 'seo',
      severity: 'high',
      issue: 'Missing meta description tag in page header',
      impact: 'Lowers click-through rates from search results by displaying random page text snippets.',
      fix: 'Add a compelling meta description between 100 and 160 characters with clear call-to-action.',
      codeSnippet: `<meta name="description" content="Wholesale acrylic photo frames and magnets crafted in Hyderabad. Precision laser-cut 2mm cast acrylic with flush neodymium magnets.">`,
    });
  }

  if (dom.canonical.status === 'valid') seoHealthScore += 15;
  else {
    issues.push({
      category: 'seo',
      severity: 'medium',
      issue: dom.canonical.status === 'missing' ? 'Missing rel="canonical" link element' : 'Canonical URL points to different URL',
      impact: 'Risk of search engines indexing parameterized or duplicate URLs.',
      fix: `Add a self-referencing canonical tag pointing to ${finalUrl}.`,
      codeSnippet: `<link rel="canonical" href="${finalUrl}">`,
    });
  }

  if (dom.headings.h1Count === 1 && !dom.headings.hierarchyJumpsDetected) {
    seoHealthScore += 15;
  } else if (dom.headings.h1Count > 1) {
    seoHealthScore += 8;
    issues.push({
      category: 'seo',
      severity: 'medium',
      issue: `Multiple (${dom.headings.h1Count}) <h1> tags detected on page`,
      impact: 'Dilutes heading topical authority for search engine crawlers.',
      fix: 'Use exactly one primary <h1> for the page title and demote secondary titles to <h2>.',
    });
  } else if (dom.headings.h1Count === 0) {
    issues.push({
      category: 'seo',
      severity: 'high',
      issue: 'Missing primary <h1> heading tag',
      impact: 'Crawlers cannot discern primary on-page content hierarchy.',
      fix: 'Wrap the primary product name or page title in a semantic <h1> tag.',
    });
  }

  if (dom.headings.hierarchyJumpsDetected) {
    issues.push({
      category: 'seo',
      severity: 'low',
      issue: 'Heading hierarchy skipped levels (<h1> immediately followed by <h3> without <h2>)',
      impact: 'Degrades screen-reader accessibility and logical content outline.',
      fix: 'Ensure heading levels decrease sequentially (H1 -> H2 -> H3).',
    });
  }

  if (!dom.robots.isNoIndex) seoHealthScore += 10;
  else {
    issues.push({
      category: 'seo',
      severity: 'critical',
      issue: 'Robots meta tag contains "noindex"',
      impact: 'Search engines are strictly instructed NOT to index this page in search results.',
      fix: 'Remove "noindex" directive from robots meta tag for public commercial pages.',
    });
  }

  if (dom.openGraph.hasTitle && dom.openGraph.hasImage) seoHealthScore += 10;
  else {
    issues.push({
      category: 'seo',
      severity: 'low',
      issue: 'Incomplete OpenGraph social sharing meta tags',
      impact: 'Degrades appearance and CTR when links are shared on WhatsApp, LinkedIn, or Twitter.',
      fix: 'Add og:title, og:description, and og:image tags pointing to 1200x630px image.',
    });
  }

  if (dom.links.emptyOrHash === 0) seoHealthScore += 10;
  else {
    seoHealthScore += Math.max(0, 10 - dom.links.emptyOrHash * 2);
    issues.push({
      category: 'seo',
      severity: 'low',
      issue: `${dom.links.emptyOrHash} placeholder link(s) detected (href="#" or href="javascript:void(0)")`,
      impact: 'Creates crawler dead-ends and confuses assistive technologies.',
      fix: 'Replace anchor tags with semantic <button> elements or valid URLs.',
    });
  }

  // Category B: Performance & Core Web Vitals (Max 100)
  let performanceScore = 0;
  if (network.ttfbMs < 200) performanceScore += 25;
  else if (network.ttfbMs < 600) performanceScore += 15;
  else {
    performanceScore += 5;
    issues.push({
      category: 'performance',
      severity: 'high',
      issue: `High server Time To First Byte (TTFB: ${network.ttfbMs}ms)`,
      impact: 'Delays browser rendering and degrades First Contentful Paint (FCP).',
      fix: 'Enable edge caching (CDN) and optimize database query response times.',
    });
  }

  if (coreWebVitals.renderBlockingScriptsCount === 0) performanceScore += 25;
  else {
    performanceScore += Math.max(0, 25 - coreWebVitals.renderBlockingScriptsCount * 10);
    issues.push({
      category: 'performance',
      severity: 'high',
      issue: `${coreWebVitals.renderBlockingScriptsCount} render-blocking <script> tag(s) in <head>`,
      impact: 'Blocks HTML DOM parsing until scripts finish downloading and executing.',
      fix: 'Add `defer` or `async` attribute to non-critical external scripts.',
      codeSnippet: `<script src="/app.js" defer></script>`,
    });
  }

  if (network.isCompressed) performanceScore += 20;
  else {
    issues.push({
      category: 'performance',
      severity: 'medium',
      issue: 'HTTP response lacks gzip/brotli text compression',
      impact: 'Increases data transfer size by up to 70% on mobile networks.',
      fix: 'Enable brotli/gzip compression in web server (Nginx/Cloudflare/Next.js config).',
    });
  }

  if (dom.images.total === 0 || dom.images.modernFormats >= dom.images.total / 2) {
    performanceScore += 15;
  } else {
    performanceScore += 5;
    issues.push({
      category: 'performance',
      severity: 'medium',
      issue: `${dom.images.total - dom.images.modernFormats} image(s) using legacy JPG/PNG formats`,
      impact: 'Inflates image download payloads; increases mobile load times.',
      fix: 'Convert product photography to modern WebP or AVIF formats.',
    });
  }

  if (network.payloadSizeKb < 100) performanceScore += 15;
  else if (network.payloadSizeKb < 250) performanceScore += 8;
  else {
    issues.push({
      category: 'performance',
      severity: 'medium',
      issue: `Large HTML payload size (${network.payloadSizeKb} KB)`,
      impact: 'Exceeds recommended 100 KB limit for initial document response.',
      fix: 'Minify inline HTML, remove unused inline scripts, and paginate long lists.',
    });
  }

  // Category C: Mobile UX & Accessibility (Max 100)
  let mobileUxScore = 0;
  if (viewportVal && viewportVal.includes('width=device-width')) {
    mobileUxScore += 30;
  } else {
    issues.push({
      category: 'mobile_ux',
      severity: 'critical',
      issue: 'Missing standard mobile responsive viewport meta tag',
      impact: 'Renders the page as desktop layout on mobile phones, breaking touch navigation.',
      fix: 'Add standard responsive viewport meta tag in <head>.',
      codeSnippet: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    });
  }

  if (dom.images.missingDimensions === 0) mobileUxScore += 25;
  else {
    mobileUxScore += Math.max(0, 25 - dom.images.missingDimensions * 5);
    issues.push({
      category: 'mobile_ux',
      severity: 'medium',
      issue: `${dom.images.missingDimensions} image(s) missing explicit width and height attributes (CLS Risk)`,
      impact: 'Causes content layout shifts as images load, degrading Cumulative Layout Shift (CLS).',
      fix: 'Add explicit `width` and `height` attributes or CSS aspect-ratio to all <img> tags.',
      codeSnippet: `<img src="/frame.webp" width="600" height="400" alt="Frame">`,
    });
  }

  if (dom.semanticHtml.hasMain && dom.semanticHtml.hasNav && dom.semanticHtml.hasFooter) {
    mobileUxScore += 20;
  } else {
    mobileUxScore += 10;
  }

  if (dom.images.total === 0 || dom.images.missingAlt === 0) {
    mobileUxScore += 25;
  } else {
    mobileUxScore += Math.max(0, 25 - dom.images.missingAlt * 5);
    issues.push({
      category: 'mobile_ux',
      severity: 'medium',
      issue: `${dom.images.missingAlt} image(s) missing descriptive alt attributes`,
      impact: 'Degrades screen-reader accessibility and image search rankings.',
      fix: 'Add descriptive alt text describing acrylic frame thickness, magnet mount, and finish.',
    });
  }

  // Category D: Structured Data & Rich Results (Max 100)
  let structuredDataScore = 0;
  if (schema.jsonLdBlocksCount > 0) structuredDataScore += 25;
  else {
    issues.push({
      category: 'schema',
      severity: 'high',
      issue: 'No JSON-LD structured data detected on page',
      impact: 'Disqualifies page from Google rich snippets, price badges, and merchant listings.',
      fix: 'Add Schema.org Product and AggregateOffer JSON-LD block in <head>.',
    });
  }

  if (schema.productSchema.found) structuredDataScore += 25;
  else {
    issues.push({
      category: 'schema',
      severity: 'medium',
      issue: 'Missing Schema.org Product entity on product landing page',
      impact: 'Google Search cannot display product pricing, stock availability, or SKU.',
      fix: 'Declare `@type: "Product"` in JSON-LD with product name and manufacturing specs.',
    });
  }

  if (schema.productSchema.hasOffers) structuredDataScore += 25;
  else if (schema.productSchema.found) {
    issues.push({
      category: 'schema',
      severity: 'high',
      issue: 'Product Schema is missing `offers` pricing property',
      impact: 'Ineligible for Google Merchant and organic price snippet displays.',
      fix: 'Add `offers` object specifying price, priceCurrency (INR), and availability.',
    });
  }

  if (schema.productSchema.hasAggregateOffer) structuredDataScore += 25;
  else if (schema.productSchema.found) {
    structuredDataScore += 10;
    issues.push({
      category: 'schema',
      severity: 'medium',
      issue: 'Product Schema lacks AggregateOffer for B2B wholesale pricing tiers',
      impact: 'Google displays only single retail price instead of volume wholesale tier savings.',
      fix: 'Add AggregateOffer with lowPrice (wholesale 500 tier) and highPrice (retail base).',
      codeSnippet: `"offers": { "@type": "AggregateOffer", "priceCurrency": "INR", "lowPrice": 79, "highPrice": 113, "priceRange": "₹79 - ₹113" }`,
    });
  }

  // Normalize all scores
  seoHealthScore = Math.max(0, Math.min(100, seoHealthScore));
  performanceScore = Math.max(0, Math.min(100, performanceScore));
  mobileUxScore = Math.max(0, Math.min(100, mobileUxScore));
  structuredDataScore = Math.max(0, Math.min(100, structuredDataScore));

  const overallScore = Math.round(
    0.35 * seoHealthScore +
      0.25 * performanceScore +
      0.2 * mobileUxScore +
      0.2 * structuredDataScore
  );

  // 8. AI Strategic Remediation with Google Gemini (3.5 Flash Lite)
  let aiRemediation: any = undefined;
  try {
    const aiSystemInstruction = `
You are the official Technical SEO & Core Web Vitals AI Diagnostic Specialist for KRIA TECH, a precision acrylic fabrication company located in Hyderabad, India.
Your task is to analyze the measured technical scan facts and generate high-priority code remediation directives for the webmaster.

MEASURED DIAGNOSTIC SCORES & STATIC HEURISTICS:
- Overall Score: ${overallScore}/100
- Technical SEO Health: ${seoHealthScore}/100
- Performance & Static Asset Heuristics: ${performanceScore}/100
- Mobile UX & Accessibility: ${mobileUxScore}/100
- Structured Data & Rich Results: ${structuredDataScore}/100

MEASURED NETWORK & STATIC DOM EVIDENCE:
- Measured Server TTFB: ${network.ttfbMs}ms (${coreWebVitals.ttfbRating})
- Render Blocking Scripts in <head>: ${coreWebVitals.renderBlockingScriptsCount}
- Static Asset Risk Indicators: LCP Heuristic ~${coreWebVitals.estimatedLcpHeuristicMs}ms, CLS Risk Score ${coreWebVitals.estimatedClsHazardScore}
- Images Missing Alt: ${dom.images.missingAlt} of ${dom.images.total}
- Images Missing Dimensions (CLS hazard): ${dom.images.missingDimensions}
- Schema Product Status: ${schema.productSchema.found ? `Found (AggregateOffer: ${schema.productSchema.hasAggregateOffer})` : 'MISSING'}

OUTPUT REQUIREMENT:
Respond ONLY with a valid JSON matching this schema:
{
  "summary": string (concise 2-sentence executive summary of technical health and primary conversion risks),
  "topPriorities": string[] (3 actionable technical directives ordered by SEO/conversion impact),
  "mobileActionDirective": string (specific mobile UX recommendation e.g. sticky WhatsApp inquiry button or touch target fix),
  "sources": string[] (list of measured standards e.g. "Google Search Central", "Web Vitals 2026"),
  "verified_facts": string[] (list of verified measured metrics from the scan)
}

${PROMPT_INJECTION_DEFENSE}
`.trim();

    const geminiPrompt = `
Synthesize technical remediation for:
- Target URL: ${finalUrl}
- Overall Score: ${overallScore}/100
- Issues Detected: ${issues.length}
${issues.slice(0, 5).map((i) => `* [${i.severity.toUpperCase()}] ${i.issue}: ${i.fix}`).join('\n')}
    `.trim();

    const geminiRes = await generateStructuredWithGemini({
      prompt: geminiPrompt,
      systemInstruction: aiSystemInstruction,
      schema: AiRemediationSchema,
    });

    if (geminiRes && geminiRes.data) {
      aiRemediation = {
        summary: geminiRes.data.summary,
        topPriorities: geminiRes.data.topPriorities,
        mobileActionDirective: geminiRes.data.mobileActionDirective,
        modelName: geminiRes.model,
      };
    }
  } catch (aiErr) {
    console.warn('AI remediation generation warning (non-fatal):', aiErr);
  }

  // 9. Persist in Supabase seo_audits Table
  let savedAuditId: string | undefined;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (process.env.NODE_ENV === 'test' || (supabaseUrl && !supabaseUrl.includes('placeholder'))) {
      let supabase: any = options.supabaseClient;
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
            target_url: finalUrl,
            audit_type: 'comprehensive-scanner',
            issues,
            recommendations: aiRemediation ? aiRemediation.topPriorities : [],
            score: overallScore,
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
  } catch (persistErr) {
    console.warn('Supabase persistence warning:', persistErr);
  }

  // 10. Submit Proposed Optimizations to Human Approval Queue
  let approvalId: string | undefined;
  try {
    const approvalPayload = {
      action_type: 'website_change' as const,
      title: `Technical SEO & Core Web Vitals Remediation: ${finalUrl} (${overallScore}/100)`,
      proposed_content: {
        target_url: finalUrl,
        overall_score: overallScore,
        scores: {
          seoHealth: seoHealthScore,
          performance: performanceScore,
          mobileUx: mobileUxScore,
          structuredData: structuredDataScore,
        },
        critical_issues: issues.filter((i) => i.severity === 'critical' || i.severity === 'high'),
        ai_priorities: aiRemediation ? aiRemediation.topPriorities : [],
      },
      destination: `Live Website Production (${finalUrl})`,
      agent_id: 'website-agent',
      risk_level: 'high' as const,
      requested_by: options.actorEmail || 'admin@kriatech.com',
    };

    const approvalRes = options.supabaseClient
      ? await createApprovalRequest(approvalPayload, options.supabaseClient)
      : await createApprovalRequest(approvalPayload);

    if (approvalRes.success && approvalRes.data) {
      approvalId = approvalRes.data.id;
    }
  } catch (approvalErr) {
    console.warn('Approval request warning:', approvalErr);
  }

  // 11. Activity Log
  await logActivity({
    entity_type: 'seo_audit',
    entity_id: savedAuditId || finalUrl,
    action: 'seo_scanner_completed',
    description: `Real website SEO scanner audited '${finalUrl}' (Overall: ${overallScore}/100, Perf: ${performanceScore}/100, TTFB: ${network.ttfbMs}ms, ${issues.length} issues)`,
    actor_type: 'agent',
    actor_id: 'website-agent',
    metadata: {
      url: finalUrl,
      overall_score: overallScore,
      ttfb_ms: network.ttfbMs,
      issues_count: issues.length,
      approval_id: approvalId,
    },
  });

  return {
    url: finalUrl,
    timestamp: new Date().toISOString(),
    executionMode,
    scores: {
      overall: overallScore,
      seoHealth: seoHealthScore,
      performance: performanceScore,
      mobileUx: mobileUxScore,
      structuredData: structuredDataScore,
    },
    network,
    dom,
    coreWebVitals,
    schema,
    issues,
    aiRemediation,
    savedAuditId,
    approvalId,
  };
}

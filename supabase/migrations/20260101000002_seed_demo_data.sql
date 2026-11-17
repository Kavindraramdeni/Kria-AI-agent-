-- ====================================================================
-- KRIA AI - Realistic Demo Data Seed Migration
-- NOTE: All sample items have is_demo = TRUE to distinguish them
-- from real production data.
-- ====================================================================

-- 1. Agent Definitions
INSERT INTO public.agent_definitions (id, name, description, category, status, config)
VALUES
    ('seo-agent', 'SEO Strategy Agent', 'Discovers high-intent keywords, clusters terms, audits on-page SEO, and tracks organic search performance for acrylic & personalization products.', 'Marketing', 'active', '{"provider": "gemini", "temperature": 0.3}'),
    ('content-agent', 'Content Studio Agent', 'Generates SEO articles, product descriptions, Instagram captions, Reels scripts, and social calendar drafts with strict approval gates.', 'Content', 'active', '{"provider": "gemini", "temperature": 0.7}'),
    ('sales-agent', 'Sales & CRM Lead Agent', 'Scores incoming retail and bulk leads, analyzes purchasing intent, suggests follow-up cadence, and drafts WhatsApp/Email quotes.', 'Sales', 'active', '{"provider": "gemini", "temperature": 0.4}'),
    ('competitor-agent', 'Competitor Intelligence Agent', 'Analyzes publicly verifiable competitor offerings, pricing strategies, and SEO gaps without unauthorized scraping.', 'Research', 'active', '{"provider": "gemini", "temperature": 0.2}'),
    ('website-agent', 'Website UX & Audit Agent', 'Performs accessibility, metadata, and link health checks on KRIA TECH landing pages, preparing change proposals for review.', 'Technical', 'active', '{"provider": "gemini", "temperature": 0.2}'),
    ('business-analyst', 'Operations & Growth Analyst', 'Synthesizes lead conversion bottlenecks, top revenue categories, and production lead times into actionable summaries.', 'Analytics', 'active', '{"provider": "gemini", "temperature": 0.3}')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

-- 2. Products (Focus: Magnetic Acrylic Photo Frames & Custom Fabrication)
INSERT INTO public.products (
    name, sku, category, description, materials, dimensions, available_shapes, customization_options,
    retail_price, bulk_price, min_bulk_quantity, production_notes, image_url, status, seo_keywords, is_demo
) VALUES
(
    'Clear Magnetic Acrylic Photo Frame (4x6 inch)',
    'MAPF-0406-CL',
    'Photo Frames',
    'Premium double-panel crystal-clear cast acrylic desktop photo frame with 4 corner neodymium magnets. Self-standing in portrait or landscape orientation.',
    ARRAY['Grade-A Cast Acrylic (10mm + 10mm)', 'N52 Nickel-Plated Neodymium Magnets'],
    '4 x 6 inches (Total thickness: 20mm)',
    ARRAY['Rectangle'],
    '{"edge_finish": ["Diamond Polished", "Beveled"], "branding": ["Laser UV Printed Logo on Base", "Gift Box Customization"]}',
    549.00,
    320.00,
    25,
    'Precision CNC laser cut with diamond edge buffing. Packed with protective peel-off film and microfiber pouch.',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    'active',
    ARRAY['magnetic acrylic photo frame', 'custom acrylic frame wholesale', 'clear desk photo frame', 'acrylic frame 4x6'],
    true
),
(
    'Clear Magnetic Acrylic Photo Frame (5x7 inch)',
    'MAPF-0507-CL',
    'Photo Frames',
    'Standard portrait desktop floating acrylic frame. Dual block acrylic held securely with strong corner magnetic closures.',
    ARRAY['Grade-A Cast Acrylic (12mm + 12mm)', 'N52 Neodymium Magnets'],
    '5 x 7 inches (Total thickness: 24mm)',
    ARRAY['Rectangle'],
    '{"edge_finish": ["Flame Polished", "Diamond Polished"], "packaging": ["White Kraft Box", "Custom Velvet Box"]}',
    799.00,
    460.00,
    20,
    'Flame polished edges for superior optical transparency. High bulk repeat demand from wedding studios.',
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    'active',
    ARRAY['5x7 acrylic photo frame', 'magnetic floating frame', 'acrylic wedding photo display'],
    true
),
(
    'Large Magnetic Acrylic Photo Block (8x10 inch)',
    'MAPF-0810-CL',
    'Photo Frames',
    'Luxury executive size dual acrylic block frame. Ultra-stable base designed for corporate certificates, executive gifts, and family portraits.',
    ARRAY['Imported Virgin Acrylic (15mm + 15mm)', 'Heavy-duty Corner Magnets'],
    '8 x 10 inches (Total thickness: 30mm)',
    ARRAY['Rectangle'],
    '{"edge_finish": ["Diamond Polished"], "engraving": ["Laser engraved text on bottom border"]}',
    1499.00,
    890.00,
    15,
    'Requires 30-ton diamond polishing wheel to guarantee zero optical distortion on 30mm cross-section.',
    'https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=600&q=80',
    'active',
    ARRAY['8x10 acrylic block frame', 'corporate executive photo frame', 'certificate acrylic block'],
    true
),
(
    'Custom Sublimation Acrylic Keychain (2x2 inch)',
    'AKC-0202-SUB',
    'Keychains',
    'Double-sided vibrant dye-sublimation coated acrylic keychain with stainless steel swivel ring. Water-resistant and scratch-resistant.',
    ARRAY['3mm Cast White Acrylic', 'Sublimation Hard Coat', 'Stainless Steel Ring'],
    '2 x 2 inches (Thickness: 3mm)',
    ARRAY['Square', 'Circle', 'Custom Die Cut'],
    '{"hardware": ["Silver Swivel Ring", "Golden Lobster Clasp", "Ball Chain"], "printing": ["Single-Sided", "Double-Sided"]}',
    99.00,
    38.00,
    100,
    'Sublimation heat pressed at 195C for 70 seconds. Die-cut on CO2 laser with minimal kerf.',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    'active',
    ARRAY['custom acrylic keychain', 'sublimation keychains bulk', 'promotional merchandise keychains'],
    true
),
(
    'Custom LED Acrylic Silhouette Desk Lamp',
    'ALED-SIGN-01',
    'Signage',
    'Edge-lit engraved acrylic lamp with solid beech wood LED base with warm white / multi-color illumination.',
    ARRAY['4mm Clear Acrylic Plate', 'Solid Beech Wood LED Base', 'USB Cable with Dimmer'],
    '6 x 8 inches acrylic on 15cm wood base',
    ARRAY['Custom Silhouette', 'Arched', 'Heart'],
    '{"lighting": ["Warm White", "Cold White", "RGB with Remote"], "base": ["Beech Wood", "Walnut Finish"]}',
    1199.00,
    650.00,
    15,
    'Vector line engraving using 0.2mm stroke width for uniform light refraction across entire graphic.',
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80',
    'active',
    ARRAY['custom led acrylic sign', 'acrylic night lamp', 'personalized led gift table sign'],
    true
),
(
    'Laser-Cut MDF Wall Art Clock Base (12 inch)',
    'MDF-CLK-12',
    'MDF Products',
    'High-density moisture-resistant MDF base designed for resin artists, clockmakers, and personalized wall decor.',
    ARRAY['6mm Green Action MDF (Grade E1)'],
    '12 inch diameter (Thickness: 6mm)',
    ARRAY['Circle', 'Scalloped', 'Geometric'],
    '{"clock_hole": ["Standard 8mm", "Silent Sweep 10mm"], "surface": ["Raw Sanded", "White Primer Coated"]}',
    249.00,
    125.00,
    50,
    'Pre-sanded with 240-grit sandpaper ready for direct acrylic pouring, resin, or laser engraving.',
    'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=600&q=80',
    'active',
    ARRAY['mdf clock base raw', 'laser cut mdf blanks', 'craft mdf shapes wholesale'],
    true
);

-- 3. Realistic Demo Leads
INSERT INTO public.leads (
    name, business_name, phone, email, source, product_interest, quantity, budget, location, status, priority, notes, follow_up_date, is_demo
) VALUES
(
    'Rohit Singhania',
    'Aura Living & Home Decor',
    '+91 98201 44521',
    'rohit@auraliving.in',
    'b2b_inquiry',
    'Clear Magnetic Acrylic Photo Frame (5x7 & 8x10)',
    200,
    95000.00,
    'Mumbai, Maharashtra',
    'qualified',
    'high',
    'Looking for premium photo display frames to supply across 3 boutique retail stores in Bandra and Juhu. Requested physical sample before finalizing purchase order.',
    CURRENT_DATE + INTERVAL '2 days',
    true
),
(
    'Pooja Hegde',
    'PixelCraft Wedding Memories',
    '+91 98450 11290',
    'pooja@pixelcraftstudio.com',
    'instagram',
    'Clear Magnetic Acrylic Photo Frame (4x6 inch)',
    75,
    28000.00,
    'Bangalore, Karnataka',
    'quotation_sent',
    'medium',
    'Wedding photography studio offering acrylic desk frames as part of their elite wedding album hampers. Provided sample quotation for 75 pcs with custom kraft boxes.',
    CURRENT_DATE + INTERVAL '3 days',
    true
),
(
    'Anand Kumar',
    'BrandElevate Corporate Gifting',
    '+91 94440 88219',
    'anand@brandelevate.co.in',
    'website',
    'Large Magnetic Acrylic Photo Block (8x10 inch)',
    350,
    310000.00,
    'Chennai, Tamil Nadu',
    'negotiation',
    'urgent',
    'Annual corporate milestone awards for an IT firm. Requires subtle UV printed logo on bottom right border. Negotiation on delivery timeline: needs by end of month.',
    CURRENT_DATE + INTERVAL '1 day',
    true
),
(
    'Meera Varma',
    'Kala Kuteer Gift Shop',
    '+91 98765 43210',
    'meera.varma@gmail.com',
    'whatsapp',
    'Custom Sublimation Acrylic Keychains & LED Signs',
    150,
    18000.00,
    'Hyderabad, Telangana',
    'contacted',
    'medium',
    'Inquired through WhatsApp catalog link. Looking for mixed batch of keychains and LED acrylic night lights for seasonal gifting.',
    CURRENT_DATE + INTERVAL '4 days',
    true
),
(
    'Vikram Mehta',
    'Vibe Creatives Cafe & Co-work',
    '+91 99100 77334',
    'vikram@vibecreatives.com',
    'direct',
    'Custom LED Acrylic Silhouette Desk Lamp & QR Stands',
    25,
    16500.00,
    'Pune, Maharashtra',
    'won',
    'high',
    'Order confirmed and advance payment received. Production scheduled for 25 custom QR desk stands with edge-lit acrylic.',
    CURRENT_DATE + INTERVAL '10 days',
    true
);

-- 4. Initial Approval Requests (Pending Strict Review Gate)
INSERT INTO public.approval_requests (
    action_type, title, proposed_content, destination, agent_id, risk_level, status
) VALUES
(
    'content_publish',
    'Instagram Post: Why Minimalist Magnetic Frames Outshine Traditional Glass',
    '{
        "caption": "Transform your memories into floating art ✨ Discover why interior designers are ditching bulky wooden frames for crystal-clear magnetic acrylic blocks. Crafted with diamond-polished optical acrylic that never clouds or yellows. #KRIAtech #AcrylicFrames #MinimalistHomeDecor #WeddingKeepsake",
        "hashtags": ["#KRIAtech", "#AcrylicPhotoFrame", "#CustomFraming", "#B2BGifting"],
        "media_specs": "Carousel 1080x1350px highlighting 20mm thickness, magnet alignment, and side reflection"
    }'::jsonb,
    'Instagram / KRIA TECH Official Feed',
    'content-agent',
    'medium',
    'pending'
),
(
    'customer_message',
    'Wholesale Quote Follow-up Email to Rohit Singhania (Aura Living)',
    '{
        "to": "rohit@auraliving.in",
        "subject": "KRIA TECH - Physical Sample Dispatch & Wholesale Tier Pricing for Magnetic Acrylic Frames",
        "body_preview": "Dear Rohit, Thank you for our discussion regarding the 5x7 and 8x10 magnetic acrylic photo frames for Aura Living stores. We have prepared two master sample pieces with our signature diamond-edge finish..."
    }'::jsonb,
    'Email Dispatch / rohit@auraliving.in',
    'sales-agent',
    'high',
    'pending'
),
(
    'campaign_launch',
    'Meta Ad Campaign: Direct Factory Acrylic Photo Frames for Photographers & Gift Stores',
    '{
        "campaign_name": "Q4 Wholesale Acrylic Framing Push",
        "target_audience": "Wedding Photographers, Gift Shop Owners, Interior Designers (India-wide)",
        "daily_budget_inr": 1500,
        "ad_copy": "Direct from Manufacturer: Precision laser-cut magnetic acrylic photo blocks. Minimum orders starting at just 15 units with custom branding."
    }'::jsonb,
    'Meta Ads Manager (Pending Account Connection)',
    'content-agent',
    'critical',
    'pending'
);

-- 5. Seed SEO Keywords (Verified KRIA TECH Niche)
INSERT INTO public.seo_keywords (keyword, search_intent, cluster, priority, target_page, status, verified_search_volume, source, is_demo)
VALUES
    ('magnetic acrylic photo frame manufacturer', 'commercial', 'Magnetic Frames', 'high', '/products/magnetic-acrylic-frames', 'targeted', 1200, 'manual', true),
    ('custom acrylic photo frame wholesale india', 'transactional', 'Magnetic Frames', 'high', '/products/acrylic-frames-bulk', 'targeted', 850, 'manual', true),
    ('clear acrylic floating frame factory', 'commercial', 'Magnetic Frames', 'medium', '/products/floating-acrylic-frames', 'discovered', 600, 'manual', true),
    ('sublimation acrylic keychains bulk price', 'transactional', 'Keychains & Gifts', 'medium', '/products/custom-keychains', 'targeted', 1900, 'manual', true),
    ('laser cut acrylic led night lamp manufacturer', 'commercial', 'LED Signage', 'high', '/products/led-acrylic-signs', 'discovered', 1400, 'manual', true),
    ('raw mdf clock base blanks wholesale', 'transactional', 'MDF Products', 'low', '/products/mdf-bases', 'discovered', 750, 'manual', true)
ON CONFLICT (keyword) DO NOTHING;

-- 6. Initial Audit Log Entries
INSERT INTO public.activity_logs (entity_type, entity_id, action, description, actor_type, actor_id, metadata)
VALUES
    ('system', 'init', 'database_provisioned', 'KRIA AI database schema and initial security policies initialized.', 'system', 'system', '{"environment": "production-ready", "schema_version": "2026.1"}'),
    ('agent', 'seo-agent', 'keywords_loaded', 'Loaded baseline target keywords for magnetic acrylic photo frames catalog.', 'agent', 'seo-agent', '{"keyword_count": 6}'),
    ('product', 'MAPF-0406-CL', 'product_created', 'Created demo product: Clear Magnetic Acrylic Photo Frame (4x6 inch)', 'system', 'system', '{"sku": "MAPF-0406-CL", "is_demo": true}');

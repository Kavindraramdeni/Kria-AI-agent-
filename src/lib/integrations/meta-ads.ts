/**
 * Meta Marketing API Adapter (Meta Graph API v21.0)
 * Launches or pauses campaigns in Meta Ads Manager.
 * Requires:
 *   - META_ACCESS_TOKEN (System user token with ads_management permission)
 *   - META_AD_ACCOUNT_ID (act_XXXXXXXXX)
 */

export interface MetaAdsCampaignParams {
  name: string;
  objective: string; // OUTCOME_SALES, OUTCOME_LEADS, OUTCOME_TRAFFIC, etc.
  dailyBudgetInr?: number;
  status?: 'PAUSED' | 'ACTIVE';
}

export interface MetaAdsDispatchResponse {
  success: boolean;
  provider: 'meta_marketing_api';
  externalCampaignId?: string;
  adAccountId: string;
  rawResponse?: any;
  error?: string;
}

export async function createMetaAdsCampaign(
  params: MetaAdsCampaignParams
): Promise<MetaAdsDispatchResponse> {
  const token = process.env.META_ACCESS_TOKEN;
  let accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !accountId) {
    throw new Error(
      'META_ADS_CONFIG_MISSING: META_ACCESS_TOKEN or META_AD_ACCOUNT_ID is not configured.'
    );
  }

  // Ensure 'act_' prefix
  if (!accountId.startsWith('act_')) {
    accountId = `act_${accountId}`;
  }

  const endpoint = `https://graph.facebook.com/v21.0/${accountId}/campaigns`;

  // Convert INR budget to paise (smallest currency unit for INR on Meta is paise = 100 paise per INR)
  const budgetInPaise = params.dailyBudgetInr ? Math.round(params.dailyBudgetInr * 100) : undefined;

  const payload: Record<string, any> = {
    name: params.name,
    objective: params.objective || 'OUTCOME_SALES',
    status: params.status || 'PAUSED', // Default to PAUSED for safety
    special_ad_categories: [],
  };

  if (budgetInPaise) {
    payload.daily_budget = budgetInPaise;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseJson = await response.json().catch(() => ({}));

  if (!response.ok || !responseJson.id) {
    const errorDetails = responseJson.error?.message || response.statusText;
    throw new Error(`META_ADS_API_ERROR (${response.status}): ${errorDetails}`);
  }

  // Actual Campaign ID returned from Meta
  const externalCampaignId = responseJson.id;

  return {
    success: true,
    provider: 'meta_marketing_api',
    externalCampaignId,
    adAccountId: accountId,
    rawResponse: responseJson,
  };
}

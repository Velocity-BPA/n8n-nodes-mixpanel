/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Base URLs for Mixpanel APIs by region
 */
export const MIXPANEL_INGESTION_URLS: Record<string, string> = {
  us: 'https://api.mixpanel.com',
  eu: 'https://api-eu.mixpanel.com',
  in: 'https://api-in.mixpanel.com',
};

export const MIXPANEL_QUERY_URLS: Record<string, string> = {
  us: 'https://mixpanel.com/api',
  eu: 'https://eu.mixpanel.com/api',
  in: 'https://in.mixpanel.com/api',
};

export const MIXPANEL_EXPORT_URLS: Record<string, string> = {
  us: 'https://data.mixpanel.com/api/2.0/export',
  eu: 'https://data-eu.mixpanel.com/api/2.0/export',
  in: 'https://data-in.mixpanel.com/api/2.0/export',
};

/**
 * API Endpoints
 */
export const ENDPOINTS = {
  // Ingestion
  TRACK: '/track',
  IMPORT: '/import',
  ENGAGE: '/engage',
  GROUPS: '/groups',

  // Query API
  INSIGHTS: '/2.0/insights',
  FUNNELS: '/2.0/funnels',
  RETENTION: '/2.0/retention',
  SEGMENTATION: '/2.0/segmentation',
  JQL: '/2.0/jql',

  // Cohorts
  COHORTS: '/2.0/cohorts',
  COHORTS_LIST: '/2.0/cohorts/list',

  // Export
  EXPORT: '/2.0/export',
  ENGAGE_EXPORT: '/2.0/engage',

  // Lookup Tables
  LOOKUP_TABLES: '/2.0/lookup-tables',
} as const;

/**
 * Rate Limits
 */
export const RATE_LIMITS = {
  INGESTION_MB_PER_MINUTE: 2048, // 2GB/minute
  QUERY_CONCURRENT: 5,
  QUERY_PER_HOUR: 60,
  EXPORT_PER_HOUR: 60,
  BATCH_SIZE: 2000,
} as const;

/**
 * User profile operations
 */
export const PROFILE_OPERATIONS = {
  SET: '$set',
  SET_ONCE: '$set_once',
  ADD: '$add',
  APPEND: '$append',
  UNION: '$union',
  REMOVE: '$remove',
  UNSET: '$unset',
  DELETE: '$delete',
} as const;

/**
 * Supported time units for queries
 */
export const TIME_UNITS = ['hour', 'day', 'week', 'month'] as const;

/**
 * Default values
 */
export const DEFAULTS = {
  BATCH_SIZE: 50,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  REQUEST_TIMEOUT_MS: 30000,
} as const;

/**
 * Licensing notice for runtime logging
 */
export const LICENSING_NOTICE = `[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.`;

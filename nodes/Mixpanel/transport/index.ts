/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  IHttpRequestMethods,
  IRequestOptions,
  IDataObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
  MIXPANEL_INGESTION_URLS,
  MIXPANEL_QUERY_URLS,
  MIXPANEL_EXPORT_URLS,
  DEFAULTS,
} from '../constants';

export interface MixpanelCredentials {
  projectToken: string;
  projectSecret: string;
  serviceAccountUsername?: string;
  serviceAccountSecret?: string;
  region: string;
}

export type ApiType = 'ingestion' | 'query' | 'export';

/**
 * Get the base URL for the specified API type and region
 */
export function getBaseUrl(region: string, apiType: ApiType): string {
  const urls = {
    ingestion: MIXPANEL_INGESTION_URLS,
    query: MIXPANEL_QUERY_URLS,
    export: MIXPANEL_EXPORT_URLS,
  };

  const url = urls[apiType][region];
  if (!url) {
    throw new Error(`Invalid region: ${region}`);
  }
  return url;
}

/**
 * Generate a unique insert ID for deduplication
 */
export function generateInsertId(distinctId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${distinctId}_${timestamp}_${random}`;
}

/**
 * Make an API request to Mixpanel Ingestion API
 */
export async function mixpanelIngestionApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject | IDataObject[],
  _qs: IDataObject = {},
): Promise<IDataObject> {
  const credentials = (await this.getCredentials('mixpanelApi')) as unknown as MixpanelCredentials;
  const baseUrl = getBaseUrl(credentials.region, 'ingestion');

  const options: IRequestOptions = {
    method,
    uri: `${baseUrl}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/plain',
    },
    body,
    json: true,
    timeout: DEFAULTS.REQUEST_TIMEOUT_MS,
  };

  try {
    const response = await this.helpers.request(options);

    // Mixpanel ingestion API returns 1 for success, 0 for failure
    if (response === 1 || response === '1') {
      return { success: true };
    }

    // If response is an object with error info
    if (typeof response === 'object') {
      return response as IDataObject;
    }

    // If we got 0 or '0', it's a failure
    if (response === 0 || response === '0') {
      throw new NodeOperationError(
        this.getNode(),
        'Mixpanel API returned failure status. Check your data format and credentials.',
      );
    }

    return { success: true, response };
  } catch (error) {
    const err = error as Error;
    throw new NodeApiError(this.getNode(), { message: err.message, name: err.name || 'Error' });
  }
}

/**
 * Make an API request to Mixpanel Query API with Basic Auth
 */
export async function mixpanelQueryApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
): Promise<IDataObject> {
  const credentials = (await this.getCredentials('mixpanelApi')) as unknown as MixpanelCredentials;
  const baseUrl = getBaseUrl(credentials.region, 'query');

  // Create Basic Auth header
  const authString = Buffer.from(`${credentials.projectSecret}:`).toString('base64');

  const options: IRequestOptions = {
    method,
    uri: `${baseUrl}${endpoint}`,
    headers: {
      Authorization: `Basic ${authString}`,
      Accept: 'application/json',
    },
    qs,
    json: true,
    timeout: DEFAULTS.REQUEST_TIMEOUT_MS,
  };

  if (method !== 'GET' && Object.keys(body).length > 0) {
    options.body = body;
    options.headers!['Content-Type'] = 'application/json';
  }

  try {
    const response = await this.helpers.request(options);
    return response as IDataObject;
  } catch (error) {
    const err = error as Error;
    throw new NodeApiError(this.getNode(), { message: err.message, name: err.name || 'Error' });
  }
}

/**
 * Make an API request to Mixpanel Export API
 */
export async function mixpanelExportApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  endpoint: string,
  qs: IDataObject = {},
): Promise<IDataObject[]> {
  const credentials = (await this.getCredentials('mixpanelApi')) as unknown as MixpanelCredentials;
  const baseUrl = getBaseUrl(credentials.region, 'export');

  // Create Basic Auth header
  const authString = Buffer.from(`${credentials.projectSecret}:`).toString('base64');

  const options: IRequestOptions = {
    method: 'GET',
    uri: endpoint === '' ? baseUrl : `${baseUrl.replace('/export', '')}${endpoint}`,
    headers: {
      Authorization: `Basic ${authString}`,
      Accept: 'application/json',
    },
    qs,
    timeout: DEFAULTS.REQUEST_TIMEOUT_MS * 2, // Longer timeout for exports
  };

  try {
    const response = await this.helpers.request(options);

    // Export API returns newline-delimited JSON
    if (typeof response === 'string') {
      const lines = response.split('\n').filter((line: string) => line.trim());
      return lines.map((line: string) => JSON.parse(line) as IDataObject);
    }

    if (Array.isArray(response)) {
      return response as IDataObject[];
    }

    return [response as IDataObject];
  } catch (error) {
    const err = error as Error;
    throw new NodeApiError(this.getNode(), { message: err.message, name: err.name || 'Error' });
  }
}

/**
 * Make an API request using Service Account authentication
 */
export async function mixpanelServiceAccountApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
): Promise<IDataObject> {
  const credentials = (await this.getCredentials('mixpanelApi')) as unknown as MixpanelCredentials;

  if (!credentials.serviceAccountUsername || !credentials.serviceAccountSecret) {
    throw new NodeOperationError(
      this.getNode(),
      'Service account credentials are required for this operation. Please configure them in your Mixpanel credentials.',
    );
  }

  const baseUrl = getBaseUrl(credentials.region, 'query');

  // Create Basic Auth header with service account credentials
  const authString = Buffer.from(
    `${credentials.serviceAccountUsername}:${credentials.serviceAccountSecret}`,
  ).toString('base64');

  const options: IRequestOptions = {
    method,
    uri: `${baseUrl}${endpoint}`,
    headers: {
      Authorization: `Basic ${authString}`,
      Accept: 'application/json',
    },
    qs,
    json: true,
    timeout: DEFAULTS.REQUEST_TIMEOUT_MS,
  };

  if (method !== 'GET' && Object.keys(body).length > 0) {
    options.body = body;
    options.headers!['Content-Type'] = 'application/json';
  }

  try {
    const response = await this.helpers.request(options);
    return response as IDataObject;
  } catch (error) {
    const err = error as Error;
    throw new NodeApiError(this.getNode(), { message: err.message, name: err.name || 'Error' });
  }
}

/**
 * Handle batch processing with retry logic
 */
export async function processBatchWithRetry<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<IDataObject>,
  retryAttempts: number = DEFAULTS.RETRY_ATTEMPTS,
): Promise<IDataObject[]> {
  const results: IDataObject[] = [];
  const batches: T[][] = [];

  // Split items into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process each batch
  for (const batch of batches) {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        const result = await processor(batch);
        results.push(result);
        lastError = null;
        break;
      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit error
        if ((error as { statusCode?: number }).statusCode === 429) {
          // Wait before retrying
          await new Promise((resolve) =>
            setTimeout(resolve, DEFAULTS.RETRY_DELAY_MS * Math.pow(2, attempt)),
          );
        } else {
          throw error;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  return results;
}

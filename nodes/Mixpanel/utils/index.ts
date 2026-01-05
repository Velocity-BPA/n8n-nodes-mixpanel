/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

/**
 * Parse a JSON string or return the object if already parsed
 */
export function parseJsonInput(input: string | IDataObject): IDataObject {
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as IDataObject;
    } catch {
      throw new Error('Invalid JSON format');
    }
  }
  return input;
}

/**
 * Convert node execution data to a flat array of data objects
 */
export function flattenExecutionData(items: INodeExecutionData[]): IDataObject[] {
  return items.map((item) => item.json);
}

/**
 * Format date to YYYY-MM-DD format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Convert timestamp to milliseconds
 */
export function toMilliseconds(timestamp: number | string): number {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

  // If timestamp is in seconds (10 digits), convert to milliseconds
  if (ts < 10000000000) {
    return ts * 1000;
  }

  return ts;
}

/**
 * Convert timestamp to seconds
 */
export function toSeconds(timestamp: number | string): number {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

  // If timestamp is in milliseconds (13 digits), convert to seconds
  if (ts > 10000000000) {
    return Math.floor(ts / 1000);
  }

  return ts;
}

/**
 * Clean undefined and null values from an object
 */
export function cleanObject(obj: IDataObject): IDataObject {
  const cleaned: IDataObject = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanObject(value as IDataObject);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
}

/**
 * Validate that required fields are present
 */
export function validateRequiredFields(
  data: IDataObject,
  requiredFields: string[],
): void {
  const missing = requiredFields.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === '',
  );

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Build event properties object for tracking
 */
export function buildEventProperties(
  token: string,
  distinctId: string,
  insertId: string,
  additionalProperties: IDataObject = {},
  options: {
    time?: number;
    ip?: string;
  } = {},
): IDataObject {
  const properties: IDataObject = {
    token,
    distinct_id: distinctId,
    $insert_id: insertId,
    ...additionalProperties,
  };

  if (options.time) {
    properties.time = toSeconds(options.time);
  } else {
    properties.time = Math.floor(Date.now() / 1000);
  }

  if (options.ip) {
    properties.ip = options.ip;
  }

  return properties;
}

/**
 * Build user profile update object
 */
export function buildProfileUpdate(
  token: string,
  distinctId: string,
  operation: string,
  properties: IDataObject,
  options: {
    ip?: string;
    ignoreTime?: boolean;
  } = {},
): IDataObject {
  const update: IDataObject = {
    $token: token,
    $distinct_id: distinctId,
    [operation]: properties,
  };

  if (options.ip) {
    update.$ip = options.ip;
  }

  if (options.ignoreTime) {
    update.$ignore_time = true;
  }

  return update;
}

/**
 * Build group update object
 */
export function buildGroupUpdate(
  token: string,
  groupKey: string,
  groupId: string,
  operation: string,
  properties: IDataObject,
): IDataObject {
  return {
    $token: token,
    $group_key: groupKey,
    $group_id: groupId,
    [operation]: properties,
  };
}

/**
 * Parse query parameters from user input
 */
export function buildQueryParams(params: IDataObject): IDataObject {
  const queryParams: IDataObject = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      // Handle date fields
      if (key.includes('date') && value instanceof Date) {
        queryParams[key] = formatDate(value);
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        queryParams[key] = JSON.stringify(value);
      }
      // Handle objects
      else if (typeof value === 'object') {
        queryParams[key] = JSON.stringify(value);
      } else {
        queryParams[key] = value;
      }
    }
  }

  return queryParams;
}

/**
 * Split items into batches
 */
export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Delay execution for a specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a standard response wrapper
 */
export function wrapResponse(
  data: IDataObject | IDataObject[],
  metadata: IDataObject = {},
): INodeExecutionData[] {
  if (Array.isArray(data)) {
    return data.map((item) => ({
      json: { ...item, ...metadata },
    }));
  }

  return [{ json: { ...data, ...metadata } }];
}

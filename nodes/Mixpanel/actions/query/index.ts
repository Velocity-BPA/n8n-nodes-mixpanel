/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeProperties,
  IDataObject,
} from 'n8n-workflow';

import { mixpanelQueryApiRequest } from '../../transport';
import { ENDPOINTS } from '../../constants';
import { buildQueryParams, formatDate, parseJsonInput, wrapResponse } from '../../utils';

export const queryOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['query'],
      },
    },
    options: [
      {
        name: 'Insights',
        value: 'insights',
        description: 'Query insights data',
        action: 'Query insights',
      },
      {
        name: 'Funnels',
        value: 'funnels',
        description: 'Query funnel data',
        action: 'Query funnels',
      },
      {
        name: 'Retention',
        value: 'retention',
        description: 'Query retention data',
        action: 'Query retention',
      },
      {
        name: 'Segmentation',
        value: 'segmentation',
        description: 'Event segmentation query',
        action: 'Query segmentation',
      },
      {
        name: 'JQL',
        value: 'jql',
        description: 'Run a JQL (JavaScript Query Language) query',
        action: 'Run JQL query',
      },
    ],
    default: 'insights',
  },
];

export const queryFields: INodeProperties[] = [
  // Common date fields for most queries
  {
    displayName: 'From Date',
    name: 'fromDate',
    type: 'dateTime',
    required: true,
    default: '',
    description: 'Start date for the query (YYYY-MM-DD)',
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['insights', 'funnels', 'retention', 'segmentation'],
      },
    },
  },
  {
    displayName: 'To Date',
    name: 'toDate',
    type: 'dateTime',
    required: true,
    default: '',
    description: 'End date for the query (YYYY-MM-DD)',
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['insights', 'funnels', 'retention', 'segmentation'],
      },
    },
  },

  // Insights specific fields
  {
    displayName: 'Bookmark ID',
    name: 'bookmarkId',
    type: 'string',
    required: true,
    default: '',
    description: 'The saved report bookmark ID',
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['insights'],
      },
    },
  },

  // Funnels specific fields
  {
    displayName: 'Funnel ID',
    name: 'funnelId',
    type: 'string',
    required: true,
    default: '',
    description: 'The funnel ID to query',
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['funnels'],
      },
    },
  },
  {
    displayName: 'Funnel Options',
    name: 'funnelOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['funnels'],
      },
    },
    options: [
      {
        displayName: 'Unit',
        name: 'unit',
        type: 'options',
        options: [
          { name: 'Day', value: 'day' },
          { name: 'Week', value: 'week' },
          { name: 'Month', value: 'month' },
        ],
        default: 'day',
        description: 'Time unit for the funnel',
      },
      {
        displayName: 'Interval',
        name: 'interval',
        type: 'number',
        default: 1,
        description: 'Number of units to include',
      },
      {
        displayName: 'On',
        name: 'on',
        type: 'string',
        default: '',
        description: 'Property to segment by',
      },
    ],
  },

  // Retention specific fields
  {
    displayName: 'Born Event',
    name: 'bornEvent',
    type: 'string',
    required: true,
    default: '',
    description: 'The event that defines when a user was "born"',
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['retention'],
      },
    },
  },
  {
    displayName: 'Retention Options',
    name: 'retentionOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['retention'],
      },
    },
    options: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'string',
        default: '',
        description: 'The event to measure retention on (defaults to any event)',
      },
      {
        displayName: 'Unit',
        name: 'unit',
        type: 'options',
        options: [
          { name: 'Day', value: 'day' },
          { name: 'Week', value: 'week' },
          { name: 'Month', value: 'month' },
        ],
        default: 'day',
        description: 'Time unit for retention periods',
      },
      {
        displayName: 'Interval Count',
        name: 'intervalCount',
        type: 'number',
        default: 10,
        description: 'Number of retention intervals to calculate',
      },
      {
        displayName: 'Where',
        name: 'where',
        type: 'string',
        default: '',
        description: 'Filter expression (e.g., \'properties["country"] == "US"\')',
      },
    ],
  },

  // Segmentation specific fields
  {
    displayName: 'Event',
    name: 'segmentEvent',
    type: 'string',
    required: true,
    default: '',
    description: 'The event to segment',
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['segmentation'],
      },
    },
  },
  {
    displayName: 'Segmentation Options',
    name: 'segmentationOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['segmentation'],
      },
    },
    options: [
      {
        displayName: 'Type',
        name: 'type',
        type: 'options',
        options: [
          { name: 'General', value: 'general' },
          { name: 'Unique', value: 'unique' },
          { name: 'Average', value: 'average' },
        ],
        default: 'general',
        description: 'Type of segmentation query',
      },
      {
        displayName: 'Unit',
        name: 'unit',
        type: 'options',
        options: [
          { name: 'Hour', value: 'hour' },
          { name: 'Day', value: 'day' },
          { name: 'Week', value: 'week' },
          { name: 'Month', value: 'month' },
        ],
        default: 'day',
        description: 'Time unit for grouping',
      },
      {
        displayName: 'On',
        name: 'on',
        type: 'string',
        default: '',
        description: 'Property to segment by (e.g., "properties[\\"city\\"]")',
      },
      {
        displayName: 'Where',
        name: 'where',
        type: 'string',
        default: '',
        description: 'Filter expression',
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 10,
        description: 'Maximum number of results',
      },
    ],
  },

  // JQL specific fields
  {
    displayName: 'Script',
    name: 'jqlScript',
    type: 'string',
    typeOptions: {
      rows: 10,
    },
    required: true,
    default: '',
    description: 'JQL script to execute',
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['jql'],
      },
    },
  },
  {
    displayName: 'Parameters',
    name: 'jqlParams',
    type: 'json',
    default: '{}',
    description: 'Parameters to pass to the JQL script',
    displayOptions: {
      show: {
        resource: ['query'],
        operation: ['jql'],
      },
    },
  },
];

/**
 * Execute query operations
 */
export async function executeQueryOperations(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  switch (operation) {
    case 'insights':
      return queryInsights.call(this, itemIndex);
    case 'funnels':
      return queryFunnels.call(this, itemIndex);
    case 'retention':
      return queryRetention.call(this, itemIndex);
    case 'segmentation':
      return querySegmentation.call(this, itemIndex);
    case 'jql':
      return runJql.call(this, itemIndex);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Query insights data
 */
async function queryInsights(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const fromDate = this.getNodeParameter('fromDate', itemIndex) as string;
  const toDate = this.getNodeParameter('toDate', itemIndex) as string;
  const bookmarkId = this.getNodeParameter('bookmarkId', itemIndex) as string;

  const qs = buildQueryParams({
    from_date: formatDate(fromDate),
    to_date: formatDate(toDate),
    bookmark_id: bookmarkId,
  });

  const response = await mixpanelQueryApiRequest.call(this, 'GET', ENDPOINTS.INSIGHTS, {}, qs);

  return wrapResponse(response);
}

/**
 * Query funnel data
 */
async function queryFunnels(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const fromDate = this.getNodeParameter('fromDate', itemIndex) as string;
  const toDate = this.getNodeParameter('toDate', itemIndex) as string;
  const funnelId = this.getNodeParameter('funnelId', itemIndex) as string;
  const options = this.getNodeParameter('funnelOptions', itemIndex, {}) as IDataObject;

  const qs = buildQueryParams({
    from_date: formatDate(fromDate),
    to_date: formatDate(toDate),
    funnel_id: funnelId,
    unit: options.unit,
    interval: options.interval,
    on: options.on,
  });

  const response = await mixpanelQueryApiRequest.call(this, 'GET', ENDPOINTS.FUNNELS, {}, qs);

  return wrapResponse(response);
}

/**
 * Query retention data
 */
async function queryRetention(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const fromDate = this.getNodeParameter('fromDate', itemIndex) as string;
  const toDate = this.getNodeParameter('toDate', itemIndex) as string;
  const bornEvent = this.getNodeParameter('bornEvent', itemIndex) as string;
  const options = this.getNodeParameter('retentionOptions', itemIndex, {}) as IDataObject;

  const qs = buildQueryParams({
    from_date: formatDate(fromDate),
    to_date: formatDate(toDate),
    born_event: bornEvent,
    event: options.event,
    unit: options.unit,
    interval_count: options.intervalCount,
    where: options.where,
  });

  const response = await mixpanelQueryApiRequest.call(this, 'GET', ENDPOINTS.RETENTION, {}, qs);

  return wrapResponse(response);
}

/**
 * Query segmentation data
 */
async function querySegmentation(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const fromDate = this.getNodeParameter('fromDate', itemIndex) as string;
  const toDate = this.getNodeParameter('toDate', itemIndex) as string;
  const event = this.getNodeParameter('segmentEvent', itemIndex) as string;
  const options = this.getNodeParameter('segmentationOptions', itemIndex, {}) as IDataObject;

  const qs = buildQueryParams({
    from_date: formatDate(fromDate),
    to_date: formatDate(toDate),
    event,
    type: options.type,
    unit: options.unit,
    on: options.on,
    where: options.where,
    limit: options.limit,
  });

  const response = await mixpanelQueryApiRequest.call(
    this,
    'GET',
    ENDPOINTS.SEGMENTATION,
    {},
    qs,
  );

  return wrapResponse(response);
}

/**
 * Run JQL query
 */
async function runJql(this: IExecuteFunctions, itemIndex: number): Promise<INodeExecutionData[]> {
  const script = this.getNodeParameter('jqlScript', itemIndex) as string;
  const paramsInput = this.getNodeParameter('jqlParams', itemIndex, '{}') as string;
  const params = parseJsonInput(paramsInput);

  const body = {
    script,
    params,
  };

  const response = await mixpanelQueryApiRequest.call(this, 'POST', ENDPOINTS.JQL, body, {});

  if (Array.isArray(response)) {
    return wrapResponse(response);
  }

  return wrapResponse(response);
}

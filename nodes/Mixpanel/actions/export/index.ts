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

import { mixpanelExportApiRequest, mixpanelQueryApiRequest } from '../../transport';
import { ENDPOINTS } from '../../constants';
import { formatDate, wrapResponse } from '../../utils';

export const exportOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['export'],
      },
    },
    options: [
      {
        name: 'Raw Events',
        value: 'rawEvents',
        description: 'Export raw event data',
        action: 'Export raw events',
      },
      {
        name: 'People',
        value: 'people',
        description: 'Export user profile data',
        action: 'Export people profiles',
      },
    ],
    default: 'rawEvents',
  },
];

export const exportFields: INodeProperties[] = [
  // Raw Events export fields
  {
    displayName: 'From Date',
    name: 'fromDate',
    type: 'dateTime',
    required: true,
    default: '',
    description: 'Start date for export (YYYY-MM-DD)',
    displayOptions: {
      show: {
        resource: ['export'],
        operation: ['rawEvents'],
      },
    },
  },
  {
    displayName: 'To Date',
    name: 'toDate',
    type: 'dateTime',
    required: true,
    default: '',
    description: 'End date for export (YYYY-MM-DD)',
    displayOptions: {
      show: {
        resource: ['export'],
        operation: ['rawEvents'],
      },
    },
  },
  {
    displayName: 'Raw Events Options',
    name: 'rawEventsOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['export'],
        operation: ['rawEvents'],
      },
    },
    options: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'string',
        default: '',
        description: 'Filter by specific event name (leave empty for all events)',
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 1000,
        description: 'Maximum number of events to return',
      },
    ],
  },

  // People export fields
  {
    displayName: 'People Options',
    name: 'peopleOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['export'],
        operation: ['people'],
      },
    },
    options: [
      {
        displayName: 'Where',
        name: 'where',
        type: 'string',
        default: '',
        description: 'Filter expression (e.g., \'properties["$country_code"] == "US"\')',
      },
      {
        displayName: 'Output Properties',
        name: 'outputProperties',
        type: 'string',
        default: '',
        description: 'Comma-separated list of properties to include in output',
      },
      {
        displayName: 'Page',
        name: 'page',
        type: 'number',
        default: 0,
        description: 'Page number for pagination',
      },
      {
        displayName: 'Session ID',
        name: 'sessionId',
        type: 'string',
        default: '',
        description: 'Session ID for pagination (returned from previous request)',
      },
    ],
  },
];

/**
 * Execute export operations
 */
export async function executeExportOperations(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  switch (operation) {
    case 'rawEvents':
      return exportRawEvents.call(this, itemIndex);
    case 'people':
      return exportPeople.call(this, itemIndex);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Export raw event data
 */
async function exportRawEvents(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const fromDate = this.getNodeParameter('fromDate', itemIndex) as string;
  const toDate = this.getNodeParameter('toDate', itemIndex) as string;
  const options = this.getNodeParameter('rawEventsOptions', itemIndex, {}) as IDataObject;

  const qs: IDataObject = {
    from_date: formatDate(fromDate),
    to_date: formatDate(toDate),
  };

  if (options.event) {
    qs.event = JSON.stringify([options.event]);
  }

  if (options.limit) {
    qs.limit = options.limit;
  }

  const response = await mixpanelExportApiRequest.call(this, '', qs);

  return wrapResponse(response);
}

/**
 * Export people/user profile data
 */
async function exportPeople(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const options = this.getNodeParameter('peopleOptions', itemIndex, {}) as IDataObject;

  const qs: IDataObject = {};

  if (options.where) {
    qs.where = options.where;
  }

  if (options.outputProperties) {
    qs.output_properties = JSON.stringify(
      (options.outputProperties as string).split(',').map((p) => p.trim()),
    );
  }

  if (options.page !== undefined) {
    qs.page = options.page;
  }

  if (options.sessionId) {
    qs.session_id = options.sessionId;
  }

  const response = await mixpanelQueryApiRequest.call(
    this,
    'GET',
    ENDPOINTS.ENGAGE_EXPORT,
    {},
    qs,
  );

  // Handle paginated response
  if (response.results && Array.isArray(response.results)) {
    const results = (response.results as IDataObject[]).map((item) => ({
      ...item,
      _metadata: {
        page: response.page,
        session_id: response.session_id,
        total: response.total,
      },
    }));
    return wrapResponse(results);
  }

  return wrapResponse(response);
}

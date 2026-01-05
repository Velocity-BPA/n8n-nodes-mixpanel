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

import {
  mixpanelIngestionApiRequest,
  generateInsertId,
  MixpanelCredentials,
} from '../../transport';
import { ENDPOINTS, RATE_LIMITS } from '../../constants';
import {
  buildEventProperties,
  parseJsonInput,
  cleanObject,
  splitIntoBatches,
  toSeconds,
  wrapResponse,
} from '../../utils';

export const eventOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['event'],
      },
    },
    options: [
      {
        name: 'Track',
        value: 'track',
        description: 'Track a single event',
        action: 'Track an event',
      },
      {
        name: 'Track Batch',
        value: 'trackBatch',
        description: 'Track multiple events in batch (up to 2000)',
        action: 'Track multiple events',
      },
      {
        name: 'Import',
        value: 'import',
        description: 'Import historical events',
        action: 'Import historical events',
      },
    ],
    default: 'track',
  },
];

export const eventFields: INodeProperties[] = [
  // Track operation fields
  {
    displayName: 'Event Name',
    name: 'eventName',
    type: 'string',
    required: true,
    default: '',
    description: 'The name of the event to track',
    displayOptions: {
      show: {
        resource: ['event'],
        operation: ['track'],
      },
    },
  },
  {
    displayName: 'Distinct ID',
    name: 'distinctId',
    type: 'string',
    required: true,
    default: '',
    description: 'A unique identifier for the user performing the event',
    displayOptions: {
      show: {
        resource: ['event'],
        operation: ['track'],
      },
    },
  },
  {
    displayName: 'Properties',
    name: 'properties',
    type: 'json',
    default: '{}',
    description: 'Additional properties for the event as JSON',
    displayOptions: {
      show: {
        resource: ['event'],
        operation: ['track'],
      },
    },
  },
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['event'],
        operation: ['track'],
      },
    },
    options: [
      {
        displayName: 'Insert ID',
        name: 'insertId',
        type: 'string',
        default: '',
        description: 'Custom insert ID for deduplication. Auto-generated if not provided.',
      },
      {
        displayName: 'Time',
        name: 'time',
        type: 'number',
        default: 0,
        description: 'Event timestamp in seconds or milliseconds. Defaults to current time.',
      },
      {
        displayName: 'IP Address',
        name: 'ip',
        type: 'string',
        default: '',
        description: 'IP address for geolocation',
      },
    ],
  },

  // Track Batch operation fields
  {
    displayName: 'Events',
    name: 'events',
    type: 'json',
    required: true,
    default: '[]',
    description:
      'Array of events to track. Each event should have: event (name), distinct_id, and optional properties.',
    displayOptions: {
      show: {
        resource: ['event'],
        operation: ['trackBatch'],
      },
    },
  },

  // Import operation fields
  {
    displayName: 'Events',
    name: 'importEvents',
    type: 'json',
    required: true,
    default: '[]',
    description:
      'Array of historical events to import. Each event should have: event, distinct_id, time, and optional properties.',
    displayOptions: {
      show: {
        resource: ['event'],
        operation: ['import'],
      },
    },
  },
];

/**
 * Execute event tracking operations
 */
export async function executeEventOperations(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('mixpanelApi')) as unknown as MixpanelCredentials;
  const token = credentials.projectToken;

  switch (operation) {
    case 'track':
      return trackEvent.call(this, token, itemIndex);
    case 'trackBatch':
      return trackBatchEvents.call(this, token, itemIndex);
    case 'import':
      return importEvents.call(this, token, itemIndex);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Track a single event
 */
async function trackEvent(
  this: IExecuteFunctions,
  token: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const eventName = this.getNodeParameter('eventName', itemIndex) as string;
  const distinctId = this.getNodeParameter('distinctId', itemIndex) as string;
  const propertiesInput = this.getNodeParameter('properties', itemIndex, '{}') as string;
  const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

  const additionalProperties = parseJsonInput(propertiesInput);
  const insertId = (options.insertId as string) || generateInsertId(distinctId);

  const properties = buildEventProperties(token, distinctId, insertId, additionalProperties, {
    time: options.time as number | undefined,
    ip: options.ip as string | undefined,
  });

  const event = {
    event: eventName,
    properties: cleanObject(properties),
  };

  const response = await mixpanelIngestionApiRequest.call(
    this,
    'POST',
    ENDPOINTS.TRACK,
    [event],
    {},
  );

  return wrapResponse({
    success: true,
    event: eventName,
    distinctId,
    insertId,
    ...response,
  });
}

/**
 * Track multiple events in batch
 */
async function trackBatchEvents(
  this: IExecuteFunctions,
  token: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const eventsInput = this.getNodeParameter('events', itemIndex) as string;
  const eventsData = parseJsonInput(eventsInput) as unknown as IDataObject[];

  if (!Array.isArray(eventsData)) {
    throw new Error('Events must be an array');
  }

  // Build events with proper structure
  const events = eventsData.map((eventData) => {
    const distinctId = (eventData.distinct_id || eventData.distinctId) as string;
    if (!distinctId) {
      throw new Error('Each event must have a distinct_id');
    }

    const eventName = (eventData.event || eventData.eventName) as string;
    if (!eventName) {
      throw new Error('Each event must have an event name');
    }

    const insertId = (eventData.$insert_id as string) || generateInsertId(distinctId);
    const existingProperties = (eventData.properties as IDataObject) || {};

    return {
      event: eventName,
      properties: cleanObject({
        token,
        distinct_id: distinctId,
        $insert_id: insertId,
        time: eventData.time
          ? toSeconds(eventData.time as number)
          : Math.floor(Date.now() / 1000),
        ...existingProperties,
      }),
    };
  });

  // Split into batches of 2000
  const batches = splitIntoBatches(events, RATE_LIMITS.BATCH_SIZE);
  const results: IDataObject[] = [];

  for (const batch of batches) {
    const response = await mixpanelIngestionApiRequest.call(
      this,
      'POST',
      ENDPOINTS.TRACK,
      batch,
      {},
    );
    results.push({
      batchSize: batch.length,
      ...response,
    });
  }

  return wrapResponse({
    success: true,
    totalEvents: events.length,
    batches: results.length,
    results,
  });
}

/**
 * Import historical events
 */
async function importEvents(
  this: IExecuteFunctions,
  token: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const eventsInput = this.getNodeParameter('importEvents', itemIndex) as string;
  const eventsData = parseJsonInput(eventsInput) as unknown as IDataObject[];

  if (!Array.isArray(eventsData)) {
    throw new Error('Events must be an array');
  }

  // Build events for import (requires time field)
  const events = eventsData.map((eventData) => {
    const distinctId = (eventData.distinct_id || eventData.distinctId) as string;
    if (!distinctId) {
      throw new Error('Each event must have a distinct_id');
    }

    const eventName = (eventData.event || eventData.eventName) as string;
    if (!eventName) {
      throw new Error('Each event must have an event name');
    }

    const time = eventData.time as number;
    if (!time) {
      throw new Error('Each imported event must have a time field');
    }

    const insertId = (eventData.$insert_id as string) || generateInsertId(distinctId);
    const existingProperties = (eventData.properties as IDataObject) || {};

    return {
      event: eventName,
      properties: cleanObject({
        token,
        distinct_id: distinctId,
        $insert_id: insertId,
        time: toSeconds(time),
        ...existingProperties,
      }),
    };
  });

  // Split into batches
  const batches = splitIntoBatches(events, RATE_LIMITS.BATCH_SIZE);
  const results: IDataObject[] = [];

  for (const batch of batches) {
    const response = await mixpanelIngestionApiRequest.call(
      this,
      'POST',
      ENDPOINTS.IMPORT,
      batch,
      {},
    );
    results.push({
      batchSize: batch.length,
      ...response,
    });
  }

  return wrapResponse({
    success: true,
    totalEvents: events.length,
    batches: results.length,
    results,
  });
}

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

import { mixpanelIngestionApiRequest, MixpanelCredentials } from '../../transport';
import { ENDPOINTS, PROFILE_OPERATIONS } from '../../constants';
import { buildGroupUpdate, parseJsonInput, cleanObject, wrapResponse } from '../../utils';

export const groupOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['group'],
      },
    },
    options: [
      {
        name: 'Set',
        value: 'set',
        description: 'Set group profile properties',
        action: 'Set group properties',
      },
      {
        name: 'Set Once',
        value: 'setOnce',
        description: 'Set properties only if they are not already set',
        action: 'Set group properties once',
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete group profile entirely',
        action: 'Delete group profile',
      },
    ],
    default: 'set',
  },
];

export const groupFields: INodeProperties[] = [
  // Common fields for all group operations
  {
    displayName: 'Group Key',
    name: 'groupKey',
    type: 'string',
    required: true,
    default: '',
    description: 'The group type key (e.g., "company", "account")',
    displayOptions: {
      show: {
        resource: ['group'],
      },
    },
  },
  {
    displayName: 'Group ID',
    name: 'groupId',
    type: 'string',
    required: true,
    default: '',
    description: 'The unique identifier for this group',
    displayOptions: {
      show: {
        resource: ['group'],
      },
    },
  },

  // Properties for set and setOnce operations
  {
    displayName: 'Properties',
    name: 'properties',
    type: 'json',
    required: true,
    default: '{}',
    description: 'Properties to set on the group profile as JSON',
    displayOptions: {
      show: {
        resource: ['group'],
        operation: ['set', 'setOnce'],
      },
    },
  },
];

/**
 * Execute group profile operations
 */
export async function executeGroupOperations(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('mixpanelApi')) as unknown as MixpanelCredentials;
  const token = credentials.projectToken;
  const groupKey = this.getNodeParameter('groupKey', itemIndex) as string;
  const groupId = this.getNodeParameter('groupId', itemIndex) as string;

  let groupOperation: string;
  let properties: IDataObject;

  switch (operation) {
    case 'set':
      groupOperation = PROFILE_OPERATIONS.SET;
      properties = parseJsonInput(this.getNodeParameter('properties', itemIndex) as string);
      break;

    case 'setOnce':
      groupOperation = PROFILE_OPERATIONS.SET_ONCE;
      properties = parseJsonInput(this.getNodeParameter('properties', itemIndex) as string);
      break;

    case 'delete':
      groupOperation = PROFILE_OPERATIONS.DELETE;
      properties = {};
      break;

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  const update = buildGroupUpdate(token, groupKey, groupId, groupOperation, properties);

  const response = await mixpanelIngestionApiRequest.call(
    this,
    'POST',
    ENDPOINTS.GROUPS,
    [cleanObject(update)],
    {},
  );

  return wrapResponse({
    success: true,
    operation,
    groupKey,
    groupId,
    ...response,
  });
}

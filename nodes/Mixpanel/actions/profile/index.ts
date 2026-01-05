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
import { buildProfileUpdate, parseJsonInput, cleanObject, wrapResponse } from '../../utils';

export const profileOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['profile'],
      },
    },
    options: [
      {
        name: 'Set',
        value: 'set',
        description: 'Set user profile properties',
        action: 'Set profile properties',
      },
      {
        name: 'Set Once',
        value: 'setOnce',
        description: 'Set properties only if they are not already set',
        action: 'Set properties once',
      },
      {
        name: 'Add',
        value: 'add',
        description: 'Increment numeric properties',
        action: 'Add to numeric properties',
      },
      {
        name: 'Append',
        value: 'append',
        description: 'Append values to list properties',
        action: 'Append to list',
      },
      {
        name: 'Union',
        value: 'union',
        description: 'Add values to list properties without duplicates',
        action: 'Union to list',
      },
      {
        name: 'Remove',
        value: 'remove',
        description: 'Remove values from list properties',
        action: 'Remove from list',
      },
      {
        name: 'Unset',
        value: 'unset',
        description: 'Remove properties from profile',
        action: 'Unset properties',
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete user profile entirely',
        action: 'Delete profile',
      },
    ],
    default: 'set',
  },
];

export const profileFields: INodeProperties[] = [
  // Common fields for all operations
  {
    displayName: 'Distinct ID',
    name: 'distinctId',
    type: 'string',
    required: true,
    default: '',
    description: 'A unique identifier for the user',
    displayOptions: {
      show: {
        resource: ['profile'],
      },
    },
  },

  // Properties for set, setOnce, add operations
  {
    displayName: 'Properties',
    name: 'properties',
    type: 'json',
    required: true,
    default: '{}',
    description: 'Properties to set on the user profile as JSON',
    displayOptions: {
      show: {
        resource: ['profile'],
        operation: ['set', 'setOnce', 'add'],
      },
    },
  },

  // Values for append, union, remove operations
  {
    displayName: 'Property Name',
    name: 'propertyName',
    type: 'string',
    required: true,
    default: '',
    description: 'Name of the list property',
    displayOptions: {
      show: {
        resource: ['profile'],
        operation: ['append', 'union', 'remove'],
      },
    },
  },
  {
    displayName: 'Values',
    name: 'values',
    type: 'json',
    required: true,
    default: '[]',
    description: 'Values to add/remove (as JSON array)',
    displayOptions: {
      show: {
        resource: ['profile'],
        operation: ['append', 'union', 'remove'],
      },
    },
  },

  // Property names for unset operation
  {
    displayName: 'Property Names',
    name: 'propertyNames',
    type: 'json',
    required: true,
    default: '[]',
    description: 'Array of property names to unset',
    displayOptions: {
      show: {
        resource: ['profile'],
        operation: ['unset'],
      },
    },
  },

  // Options for all profile operations
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['profile'],
        operation: ['set', 'setOnce', 'add', 'append', 'union', 'remove', 'unset', 'delete'],
      },
    },
    options: [
      {
        displayName: 'IP Address',
        name: 'ip',
        type: 'string',
        default: '',
        description: 'IP address for geolocation',
      },
      {
        displayName: 'Ignore Time',
        name: 'ignoreTime',
        type: 'boolean',
        default: false,
        description: 'Whether to skip updating the "Last Seen" timestamp',
      },
    ],
  },
];

/**
 * Execute user profile operations
 */
export async function executeProfileOperations(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('mixpanelApi')) as unknown as MixpanelCredentials;
  const token = credentials.projectToken;
  const distinctId = this.getNodeParameter('distinctId', itemIndex) as string;
  const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

  let profileOperation: string;
  let properties: IDataObject;

  switch (operation) {
    case 'set':
      profileOperation = PROFILE_OPERATIONS.SET;
      properties = parseJsonInput(this.getNodeParameter('properties', itemIndex) as string);
      break;

    case 'setOnce':
      profileOperation = PROFILE_OPERATIONS.SET_ONCE;
      properties = parseJsonInput(this.getNodeParameter('properties', itemIndex) as string);
      break;

    case 'add':
      profileOperation = PROFILE_OPERATIONS.ADD;
      properties = parseJsonInput(this.getNodeParameter('properties', itemIndex) as string);
      break;

    case 'append': {
      profileOperation = PROFILE_OPERATIONS.APPEND;
      const appendPropertyName = this.getNodeParameter('propertyName', itemIndex) as string;
      const appendValues = parseJsonInput(this.getNodeParameter('values', itemIndex) as string);
      properties = { [appendPropertyName]: appendValues };
      break;
    }

    case 'union': {
      profileOperation = PROFILE_OPERATIONS.UNION;
      const unionPropertyName = this.getNodeParameter('propertyName', itemIndex) as string;
      const unionValues = parseJsonInput(this.getNodeParameter('values', itemIndex) as string);
      properties = { [unionPropertyName]: unionValues };
      break;
    }

    case 'remove': {
      profileOperation = PROFILE_OPERATIONS.REMOVE;
      const removePropertyName = this.getNodeParameter('propertyName', itemIndex) as string;
      const removeValues = parseJsonInput(this.getNodeParameter('values', itemIndex) as string);
      properties = { [removePropertyName]: removeValues };
      break;
    }

    case 'unset': {
      profileOperation = PROFILE_OPERATIONS.UNSET;
      const propertyNames = parseJsonInput(
        this.getNodeParameter('propertyNames', itemIndex) as string,
      );
      if (!Array.isArray(propertyNames)) {
        throw new Error('Property names must be an array');
      }
      properties = propertyNames as unknown as IDataObject;
      break;
    }

    case 'delete':
      profileOperation = PROFILE_OPERATIONS.DELETE;
      properties = {};
      break;

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  const update = buildProfileUpdate(token, distinctId, profileOperation, properties, {
    ip: options.ip as string | undefined,
    ignoreTime: options.ignoreTime as boolean | undefined,
  });

  const response = await mixpanelIngestionApiRequest.call(
    this,
    'POST',
    ENDPOINTS.ENGAGE,
    [cleanObject(update)],
    {},
  );

  return wrapResponse({
    success: true,
    operation,
    distinctId,
    ...response,
  });
}

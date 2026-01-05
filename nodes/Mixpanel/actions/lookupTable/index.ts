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

import { mixpanelServiceAccountApiRequest } from '../../transport';
import { ENDPOINTS } from '../../constants';
import { wrapResponse } from '../../utils';

export const lookupTableOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['lookupTable'],
      },
    },
    options: [
      {
        name: 'List',
        value: 'list',
        description: 'List all lookup tables',
        action: 'List lookup tables',
      },
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new lookup table',
        action: 'Create lookup table',
      },
      {
        name: 'Replace',
        value: 'replace',
        description: 'Replace lookup table data',
        action: 'Replace lookup table data',
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete a lookup table',
        action: 'Delete lookup table',
      },
    ],
    default: 'list',
  },
];

export const lookupTableFields: INodeProperties[] = [
  // Table ID for operations that require it
  {
    displayName: 'Table ID',
    name: 'tableId',
    type: 'string',
    required: true,
    default: '',
    description: 'The ID of the lookup table',
    displayOptions: {
      show: {
        resource: ['lookupTable'],
        operation: ['replace', 'delete'],
      },
    },
  },

  // Create operation fields
  {
    displayName: 'Table Name',
    name: 'tableName',
    type: 'string',
    required: true,
    default: '',
    description: 'Name for the new lookup table',
    displayOptions: {
      show: {
        resource: ['lookupTable'],
        operation: ['create'],
      },
    },
  },
  {
    displayName: 'CSV Data',
    name: 'csvData',
    type: 'string',
    typeOptions: {
      rows: 10,
    },
    required: true,
    default: '',
    description:
      'CSV data for the lookup table. First row should be headers. First column is the lookup key.',
    displayOptions: {
      show: {
        resource: ['lookupTable'],
        operation: ['create'],
      },
    },
  },

  // Replace operation fields
  {
    displayName: 'CSV Data',
    name: 'replaceCsvData',
    type: 'string',
    typeOptions: {
      rows: 10,
    },
    required: true,
    default: '',
    description: 'New CSV data to replace the existing table data',
    displayOptions: {
      show: {
        resource: ['lookupTable'],
        operation: ['replace'],
      },
    },
  },
];

/**
 * Execute lookup table operations
 */
export async function executeLookupTableOperations(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  switch (operation) {
    case 'list':
      return listLookupTables.call(this);
    case 'create':
      return createLookupTable.call(this, itemIndex);
    case 'replace':
      return replaceLookupTable.call(this, itemIndex);
    case 'delete':
      return deleteLookupTable.call(this, itemIndex);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * List all lookup tables
 */
async function listLookupTables(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
  const response = await mixpanelServiceAccountApiRequest.call(
    this,
    'GET',
    ENDPOINTS.LOOKUP_TABLES,
    {},
    {},
  );

  if (Array.isArray(response)) {
    return wrapResponse(response);
  }

  return wrapResponse(response);
}

/**
 * Create a new lookup table
 */
async function createLookupTable(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const tableName = this.getNodeParameter('tableName', itemIndex) as string;
  const csvData = this.getNodeParameter('csvData', itemIndex) as string;

  const body: IDataObject = {
    name: tableName,
    data: csvData,
  };

  const response = await mixpanelServiceAccountApiRequest.call(
    this,
    'POST',
    ENDPOINTS.LOOKUP_TABLES,
    body,
    {},
  );

  return wrapResponse({
    success: true,
    tableName,
    ...response,
  });
}

/**
 * Replace lookup table data
 */
async function replaceLookupTable(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const tableId = this.getNodeParameter('tableId', itemIndex) as string;
  const csvData = this.getNodeParameter('replaceCsvData', itemIndex) as string;

  const body: IDataObject = {
    data: csvData,
  };

  const response = await mixpanelServiceAccountApiRequest.call(
    this,
    'PUT',
    `${ENDPOINTS.LOOKUP_TABLES}/${tableId}`,
    body,
    {},
  );

  return wrapResponse({
    success: true,
    tableId,
    ...response,
  });
}

/**
 * Delete a lookup table
 */
async function deleteLookupTable(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const tableId = this.getNodeParameter('tableId', itemIndex) as string;

  const response = await mixpanelServiceAccountApiRequest.call(
    this,
    'DELETE',
    `${ENDPOINTS.LOOKUP_TABLES}/${tableId}`,
    {},
    {},
  );

  return wrapResponse({
    success: true,
    tableId,
    deleted: true,
    ...response,
  });
}

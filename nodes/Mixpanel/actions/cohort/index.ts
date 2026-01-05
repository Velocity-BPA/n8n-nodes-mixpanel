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
import { wrapResponse } from '../../utils';

export const cohortOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['cohort'],
      },
    },
    options: [
      {
        name: 'List',
        value: 'list',
        description: 'List all cohorts',
        action: 'List cohorts',
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Get a specific cohort',
        action: 'Get cohort',
      },
      {
        name: 'Get Members',
        value: 'getMembers',
        description: 'Get members of a cohort',
        action: 'Get cohort members',
      },
    ],
    default: 'list',
  },
];

export const cohortFields: INodeProperties[] = [
  // Get operation fields
  {
    displayName: 'Cohort ID',
    name: 'cohortId',
    type: 'string',
    required: true,
    default: '',
    description: 'The ID of the cohort',
    displayOptions: {
      show: {
        resource: ['cohort'],
        operation: ['get', 'getMembers'],
      },
    },
  },

  // Get Members options
  {
    displayName: 'Options',
    name: 'membersOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    displayOptions: {
      show: {
        resource: ['cohort'],
        operation: ['getMembers'],
      },
    },
    options: [
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
 * Execute cohort operations
 */
export async function executeCohortOperations(
  this: IExecuteFunctions,
  operation: string,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  switch (operation) {
    case 'list':
      return listCohorts.call(this);
    case 'get':
      return getCohort.call(this, itemIndex);
    case 'getMembers':
      return getCohortMembers.call(this, itemIndex);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * List all cohorts
 */
async function listCohorts(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
  const response = await mixpanelQueryApiRequest.call(
    this,
    'GET',
    ENDPOINTS.COHORTS_LIST,
    {},
    {},
  );

  if (Array.isArray(response)) {
    return wrapResponse(response);
  }

  return wrapResponse(response);
}

/**
 * Get a specific cohort
 */
async function getCohort(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const cohortId = this.getNodeParameter('cohortId', itemIndex) as string;

  const qs: IDataObject = {
    id: cohortId,
  };

  const response = await mixpanelQueryApiRequest.call(this, 'GET', ENDPOINTS.COHORTS, {}, qs);

  return wrapResponse(response);
}

/**
 * Get members of a cohort
 */
async function getCohortMembers(
  this: IExecuteFunctions,
  itemIndex: number,
): Promise<INodeExecutionData[]> {
  const cohortId = this.getNodeParameter('cohortId', itemIndex) as string;
  const options = this.getNodeParameter('membersOptions', itemIndex, {}) as IDataObject;

  const qs: IDataObject = {
    id: cohortId,
  };

  if (options.page !== undefined) {
    qs.page = options.page;
  }

  if (options.sessionId) {
    qs.session_id = options.sessionId;
  }

  // Use engage endpoint for cohort members
  const response = await mixpanelQueryApiRequest.call(
    this,
    'GET',
    `${ENDPOINTS.COHORTS}/${cohortId}/users`,
    {},
    qs,
  );

  return wrapResponse(response);
}

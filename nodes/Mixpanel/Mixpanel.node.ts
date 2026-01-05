/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { LICENSING_NOTICE } from './constants';

// Import operations and fields
import { eventOperations, eventFields, executeEventOperations } from './actions/event';
import { profileOperations, profileFields, executeProfileOperations } from './actions/profile';
import { groupOperations, groupFields, executeGroupOperations } from './actions/group';
import { queryOperations, queryFields, executeQueryOperations } from './actions/query';
import { cohortOperations, cohortFields, executeCohortOperations } from './actions/cohort';
import { exportOperations, exportFields, executeExportOperations } from './actions/export';
import {
  lookupTableOperations,
  lookupTableFields,
  executeLookupTableOperations,
} from './actions/lookupTable';

// License notice flag to ensure single log per load
let licenseNoticeLogged = false;

export class Mixpanel implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Mixpanel',
    name: 'mixpanel',
    icon: 'file:mixpanel.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description:
      'Interact with Mixpanel API for event tracking, user analytics, and data export',
    defaults: {
      name: 'Mixpanel',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'mixpanelApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Event',
            value: 'event',
            description: 'Track and import events',
          },
          {
            name: 'User Profile',
            value: 'profile',
            description: 'Manage user profiles',
          },
          {
            name: 'Group',
            value: 'group',
            description: 'Manage group profiles',
          },
          {
            name: 'Query',
            value: 'query',
            description: 'Query analytics data',
          },
          {
            name: 'Cohort',
            value: 'cohort',
            description: 'Manage cohorts',
          },
          {
            name: 'Export',
            value: 'export',
            description: 'Export raw data',
          },
          {
            name: 'Lookup Table',
            value: 'lookupTable',
            description: 'Manage lookup tables',
          },
        ],
        default: 'event',
      },
      // Event operations and fields
      ...eventOperations,
      ...eventFields,
      // Profile operations and fields
      ...profileOperations,
      ...profileFields,
      // Group operations and fields
      ...groupOperations,
      ...groupFields,
      // Query operations and fields
      ...queryOperations,
      ...queryFields,
      // Cohort operations and fields
      ...cohortOperations,
      ...cohortFields,
      // Export operations and fields
      ...exportOperations,
      ...exportFields,
      // Lookup Table operations and fields
      ...lookupTableOperations,
      ...lookupTableFields,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // Log licensing notice once per node load
    if (!licenseNoticeLogged) {
      console.warn(LICENSING_NOTICE);
      licenseNoticeLogged = true;
    }

    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let result: INodeExecutionData[];

        switch (resource) {
          case 'event':
            result = await executeEventOperations.call(this, operation, i);
            break;

          case 'profile':
            result = await executeProfileOperations.call(this, operation, i);
            break;

          case 'group':
            result = await executeGroupOperations.call(this, operation, i);
            break;

          case 'query':
            result = await executeQueryOperations.call(this, operation, i);
            break;

          case 'cohort':
            result = await executeCohortOperations.call(this, operation, i);
            break;

          case 'export':
            result = await executeExportOperations.call(this, operation, i);
            break;

          case 'lookupTable':
            result = await executeLookupTableOperations.call(this, operation, i);
            break;

          default:
            throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
              itemIndex: i,
            });
        }

        returnData.push(...result);
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class MixpanelApi implements ICredentialType {
  name = 'mixpanelApi';
  displayName = 'Mixpanel API';
  documentationUrl = 'https://developer.mixpanel.com/reference/overview';

  properties: INodeProperties[] = [
    {
      displayName: 'Project Token',
      name: 'projectToken',
      type: 'string',
      default: '',
      required: true,
      description: 'The project token found in Project Settings. Used for event tracking and ingestion.',
      hint: 'Found in Project Settings → Access Keys',
    },
    {
      displayName: 'Project Secret',
      name: 'projectSecret',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      description: 'The API secret found in Project Settings. Used for Query and Export APIs.',
      hint: 'Found in Project Settings → Access Keys',
    },
    {
      displayName: 'Service Account Username',
      name: 'serviceAccountUsername',
      type: 'string',
      default: '',
      description: 'Optional service account username for management APIs. Leave empty if not using service accounts.',
    },
    {
      displayName: 'Service Account Secret',
      name: 'serviceAccountSecret',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Optional service account secret for management APIs. Leave empty if not using service accounts.',
    },
    {
      displayName: 'Region',
      name: 'region',
      type: 'options',
      default: 'us',
      options: [
        {
          name: 'United States',
          value: 'us',
        },
        {
          name: 'European Union',
          value: 'eu',
        },
        {
          name: 'India',
          value: 'in',
        },
      ],
      description: 'The data residency region for your Mixpanel project',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      method: 'POST',
      url: '={{$credentials.region === "eu" ? "https://api-eu.mixpanel.com" : $credentials.region === "in" ? "https://api-in.mixpanel.com" : "https://api.mixpanel.com"}}/track',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
      },
      body: JSON.stringify([
        {
          event: 'n8n_credential_test',
          properties: {
            token: '={{$credentials.projectToken}}',
            distinct_id: 'n8n_test',
            time: Date.now(),
          },
        },
      ]),
    },
  };
}

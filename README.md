# n8n-nodes-mixpanel

> **[Velocity BPA Licensing Notice]**
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for Mixpanel providing event tracking, user analytics, cohort management, and data export capabilities. This node integrates with Mixpanel's APIs to enable powerful workflow automation for product analytics.

![n8n](https://img.shields.io/badge/n8n-community--node-green)
![Mixpanel](https://img.shields.io/badge/Mixpanel-API-7856FF)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

## Features

- **Event Tracking**: Track single events, batch events, and import historical data
- **User Profiles**: Complete profile management with set, setOnce, add, append, union, remove, unset, and delete operations
- **Group Analytics**: Manage group profiles for B2B analytics
- **Query API**: Access insights, funnels, retention, segmentation, and JQL queries
- **Cohort Management**: List and retrieve cohort data and members
- **Data Export**: Export raw event data and user profiles
- **Lookup Tables**: Create, manage, and update lookup tables
- **Multi-Region Support**: US, EU, and India data residency regions
- **Rate Limit Handling**: Built-in batch processing and retry logic

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** → **Community Nodes**
3. Click **Install**
4. Enter `n8n-nodes-mixpanel`
5. Accept the risks and click **Install**

### Manual Installation

```bash
# Navigate to your n8n installation directory
cd ~/.n8n

# Install the package
npm install n8n-nodes-mixpanel
```

### Development Installation

```bash
# Clone the repository
git clone https://github.com/Velocity-BPA/n8n-nodes-mixpanel.git
cd n8n-nodes-mixpanel

# Install dependencies
npm install

# Build the project
npm run build

# Create symlink to n8n custom nodes
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-mixpanel

# Restart n8n
```

## Credentials Setup

### Creating Mixpanel API Credentials

1. Log in to your Mixpanel account
2. Navigate to **Project Settings** → **Access Keys**
3. Copy your **Project Token** and **API Secret**

### Credential Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Project Token | String | Yes | Found in Project Settings → Access Keys |
| Project Secret | Password | Yes | API Secret for Query and Export APIs |
| Service Account Username | String | No | For Lookup Tables management |
| Service Account Secret | Password | No | For Lookup Tables management |
| Region | Options | Yes | US (default), EU, or India |

## Resources & Operations

### Event

| Operation | Description |
|-----------|-------------|
| Track | Track a single event with properties |
| Track Batch | Track up to 2000 events in a single request |
| Import | Import historical events with timestamps |

### User Profile

| Operation | Description |
|-----------|-------------|
| Set | Set user profile properties |
| Set Once | Set properties only if not already set |
| Add | Increment numeric properties |
| Append | Append values to list properties |
| Union | Add to list without duplicates |
| Remove | Remove values from list properties |
| Unset | Remove properties from profile |
| Delete | Delete entire user profile |

### Group

| Operation | Description |
|-----------|-------------|
| Set | Set group profile properties |
| Set Once | Set properties only if not already set |
| Delete | Delete entire group profile |

### Query

| Operation | Description |
|-----------|-------------|
| Insights | Query saved insights reports |
| Funnels | Query funnel conversion data |
| Retention | Query retention metrics |
| Segmentation | Event segmentation queries |
| JQL | Run custom JQL queries |

### Cohort

| Operation | Description |
|-----------|-------------|
| List | List all cohorts in the project |
| Get | Get details of a specific cohort |
| Get Members | Get users in a cohort |

### Export

| Operation | Description |
|-----------|-------------|
| Raw Events | Export raw event data by date range |
| People | Export user profile data |

### Lookup Table

| Operation | Description |
|-----------|-------------|
| List | List all lookup tables |
| Create | Create a new lookup table |
| Replace | Replace existing table data |
| Delete | Delete a lookup table |

## Usage Examples

### Track an Event

```javascript
{
  "resource": "event",
  "operation": "track",
  "eventName": "Purchase Completed",
  "distinctId": "user_123",
  "properties": {
    "product_id": "SKU-001",
    "price": 99.99,
    "currency": "USD"
  }
}
```

### Update User Profile

```javascript
{
  "resource": "profile",
  "operation": "set",
  "distinctId": "user_123",
  "properties": {
    "$name": "John Doe",
    "$email": "john@example.com",
    "plan_type": "premium",
    "signup_date": "2024-01-15"
  }
}
```

### Query Funnel Data

```javascript
{
  "resource": "query",
  "operation": "funnels",
  "funnelId": "12345",
  "fromDate": "2024-01-01",
  "toDate": "2024-01-31",
  "funnelOptions": {
    "unit": "day"
  }
}
```

### Export Raw Events

```javascript
{
  "resource": "export",
  "operation": "rawEvents",
  "fromDate": "2024-01-01",
  "toDate": "2024-01-07",
  "rawEventsOptions": {
    "event": "Sign Up",
    "limit": 1000
  }
}
```

## Mixpanel Concepts

### Events
Events represent user actions in your product. Each event has a name, a distinct ID identifying the user, and optional properties providing context.

### User Profiles
User profiles store persistent data about users, including demographics, preferences, and computed properties.

### Groups
Groups enable B2B analytics by associating users with accounts, companies, or other entities.

### Cohorts
Cohorts are segments of users defined by shared behaviors or attributes, useful for targeted analysis.

### JQL (JavaScript Query Language)
JQL allows complex custom queries using JavaScript syntax for advanced analytics needs.

## Data Regions

| Region | Ingestion URL | Query URL |
|--------|---------------|-----------|
| US | api.mixpanel.com | mixpanel.com/api |
| EU | api-eu.mixpanel.com | eu.mixpanel.com/api |
| India | api-in.mixpanel.com | in.mixpanel.com/api |

## Rate Limits

- **Ingestion**: 2GB/minute uncompressed JSON
- **Query API**: 5 concurrent requests, 60 per hour
- **Export API**: 60 requests per hour
- **Batch Size**: Up to 2000 events per request

## Error Handling

The node handles common Mixpanel API errors:

| Status | Description |
|--------|-------------|
| 200 | Success (verify response body) |
| 400 | Invalid request format |
| 401 | Invalid credentials |
| 402 | Payment required |
| 429 | Rate limit exceeded |
| 500 | Server error |

Enable "Continue On Fail" to handle errors gracefully in workflows.

## Security Best Practices

1. **Protect Credentials**: Never expose your API secret in client-side code
2. **Use Service Accounts**: For lookup table management, use dedicated service accounts
3. **Region Selection**: Choose the appropriate region for data residency compliance
4. **Rate Limiting**: Implement appropriate delays between batch operations

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service, or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code passes linting and tests before submitting.

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-mixpanel/issues)
- **Documentation**: [Mixpanel API Docs](https://developer.mixpanel.com/reference/overview)
- **Email**: support@velobpa.com

## Acknowledgments

- [Mixpanel](https://mixpanel.com) for their comprehensive analytics platform
- [n8n](https://n8n.io) for the workflow automation platform
- The n8n community for inspiration and best practices

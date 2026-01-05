/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  getBaseUrl,
  generateInsertId,
} from '../../nodes/Mixpanel/transport';

import {
  parseJsonInput,
  formatDate,
  toMilliseconds,
  toSeconds,
  cleanObject,
  validateRequiredFields,
  buildEventProperties,
  buildProfileUpdate,
  buildGroupUpdate,
  splitIntoBatches,
} from '../../nodes/Mixpanel/utils';

import {
  MIXPANEL_INGESTION_URLS,
  MIXPANEL_QUERY_URLS,
  MIXPANEL_EXPORT_URLS,
  PROFILE_OPERATIONS,
  RATE_LIMITS,
} from '../../nodes/Mixpanel/constants';

describe('Mixpanel Node', () => {
  describe('Constants', () => {
    it('should have correct ingestion URLs', () => {
      expect(MIXPANEL_INGESTION_URLS.us).toBe('https://api.mixpanel.com');
      expect(MIXPANEL_INGESTION_URLS.eu).toBe('https://api-eu.mixpanel.com');
      expect(MIXPANEL_INGESTION_URLS.in).toBe('https://api-in.mixpanel.com');
    });

    it('should have correct query URLs', () => {
      expect(MIXPANEL_QUERY_URLS.us).toBe('https://mixpanel.com/api');
      expect(MIXPANEL_QUERY_URLS.eu).toBe('https://eu.mixpanel.com/api');
      expect(MIXPANEL_QUERY_URLS.in).toBe('https://in.mixpanel.com/api');
    });

    it('should have correct export URLs', () => {
      expect(MIXPANEL_EXPORT_URLS.us).toBe('https://data.mixpanel.com/api/2.0/export');
      expect(MIXPANEL_EXPORT_URLS.eu).toBe('https://data-eu.mixpanel.com/api/2.0/export');
      expect(MIXPANEL_EXPORT_URLS.in).toBe('https://data-in.mixpanel.com/api/2.0/export');
    });

    it('should have correct profile operations', () => {
      expect(PROFILE_OPERATIONS.SET).toBe('$set');
      expect(PROFILE_OPERATIONS.SET_ONCE).toBe('$set_once');
      expect(PROFILE_OPERATIONS.ADD).toBe('$add');
      expect(PROFILE_OPERATIONS.APPEND).toBe('$append');
      expect(PROFILE_OPERATIONS.UNION).toBe('$union');
      expect(PROFILE_OPERATIONS.REMOVE).toBe('$remove');
      expect(PROFILE_OPERATIONS.UNSET).toBe('$unset');
      expect(PROFILE_OPERATIONS.DELETE).toBe('$delete');
    });

    it('should have correct rate limits', () => {
      expect(RATE_LIMITS.BATCH_SIZE).toBe(2000);
      expect(RATE_LIMITS.QUERY_CONCURRENT).toBe(5);
      expect(RATE_LIMITS.QUERY_PER_HOUR).toBe(60);
      expect(RATE_LIMITS.EXPORT_PER_HOUR).toBe(60);
    });
  });

  describe('Transport - getBaseUrl', () => {
    it('should return correct ingestion URL for US region', () => {
      const url = getBaseUrl('us', 'ingestion');
      expect(url).toBe('https://api.mixpanel.com');
    });

    it('should return correct ingestion URL for EU region', () => {
      const url = getBaseUrl('eu', 'ingestion');
      expect(url).toBe('https://api-eu.mixpanel.com');
    });

    it('should return correct query URL for US region', () => {
      const url = getBaseUrl('us', 'query');
      expect(url).toBe('https://mixpanel.com/api');
    });

    it('should return correct export URL for US region', () => {
      const url = getBaseUrl('us', 'export');
      expect(url).toBe('https://data.mixpanel.com/api/2.0/export');
    });

    it('should throw error for invalid region', () => {
      expect(() => getBaseUrl('invalid', 'ingestion')).toThrow('Invalid region: invalid');
    });
  });

  describe('Transport - generateInsertId', () => {
    it('should generate unique insert IDs', () => {
      const id1 = generateInsertId('user123');
      const id2 = generateInsertId('user123');
      expect(id1).not.toBe(id2);
    });

    it('should include distinct ID in insert ID', () => {
      const id = generateInsertId('user123');
      expect(id).toContain('user123');
    });

    it('should generate IDs with expected format', () => {
      const id = generateInsertId('user123');
      const parts = id.split('_');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('user123');
    });
  });

  describe('Utils - parseJsonInput', () => {
    it('should parse valid JSON string', () => {
      const result = parseJsonInput('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should return object if already an object', () => {
      const obj = { key: 'value' };
      const result = parseJsonInput(obj);
      expect(result).toEqual(obj);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseJsonInput('invalid json')).toThrow('Invalid JSON format');
    });
  });

  describe('Utils - formatDate', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const result = formatDate(date);
      expect(result).toBe('2024-06-15');
    });

    it('should format date string to YYYY-MM-DD', () => {
      const result = formatDate('2024-06-15T12:00:00Z');
      expect(result).toBe('2024-06-15');
    });
  });

  describe('Utils - toMilliseconds', () => {
    it('should convert seconds to milliseconds', () => {
      const result = toMilliseconds(1700000000);
      expect(result).toBe(1700000000000);
    });

    it('should keep milliseconds as is', () => {
      const result = toMilliseconds(1700000000000);
      expect(result).toBe(1700000000000);
    });

    it('should handle string input', () => {
      const result = toMilliseconds('1700000000');
      expect(result).toBe(1700000000000);
    });
  });

  describe('Utils - toSeconds', () => {
    it('should convert milliseconds to seconds', () => {
      const result = toSeconds(1700000000000);
      expect(result).toBe(1700000000);
    });

    it('should keep seconds as is', () => {
      const result = toSeconds(1700000000);
      expect(result).toBe(1700000000);
    });

    it('should handle string input', () => {
      const result = toSeconds('1700000000000');
      expect(result).toBe(1700000000);
    });
  });

  describe('Utils - cleanObject', () => {
    it('should remove undefined values', () => {
      const obj = { a: 'value', b: undefined, c: 'other' };
      const result = cleanObject(obj);
      expect(result).toEqual({ a: 'value', c: 'other' });
    });

    it('should remove null values', () => {
      const obj = { a: 'value', b: null, c: 'other' };
      const result = cleanObject(obj);
      expect(result).toEqual({ a: 'value', c: 'other' });
    });

    it('should remove empty string values', () => {
      const obj = { a: 'value', b: '', c: 'other' };
      const result = cleanObject(obj);
      expect(result).toEqual({ a: 'value', c: 'other' });
    });

    it('should keep zero values', () => {
      const obj = { a: 0, b: 'value' };
      const result = cleanObject(obj);
      expect(result).toEqual({ a: 0, b: 'value' });
    });

    it('should keep false values', () => {
      const obj = { a: false, b: 'value' };
      const result = cleanObject(obj);
      expect(result).toEqual({ a: false, b: 'value' });
    });

    it('should handle nested objects', () => {
      const obj = { a: { b: undefined, c: 'value' }, d: 'other' };
      const result = cleanObject(obj);
      expect(result).toEqual({ a: { c: 'value' }, d: 'other' });
    });
  });

  describe('Utils - validateRequiredFields', () => {
    it('should not throw for valid data', () => {
      const data = { field1: 'value1', field2: 'value2' };
      expect(() => validateRequiredFields(data, ['field1', 'field2'])).not.toThrow();
    });

    it('should throw for missing fields', () => {
      const data = { field1: 'value1' };
      expect(() => validateRequiredFields(data, ['field1', 'field2'])).toThrow(
        'Missing required fields: field2',
      );
    });

    it('should throw for empty values', () => {
      const data = { field1: 'value1', field2: '' };
      expect(() => validateRequiredFields(data, ['field1', 'field2'])).toThrow(
        'Missing required fields: field2',
      );
    });
  });

  describe('Utils - buildEventProperties', () => {
    it('should build event properties with required fields', () => {
      const result = buildEventProperties('token123', 'user123', 'insert123');
      expect(result.token).toBe('token123');
      expect(result.distinct_id).toBe('user123');
      expect(result.$insert_id).toBe('insert123');
      expect(result.time).toBeDefined();
    });

    it('should include additional properties', () => {
      const additional = { custom: 'value', number: 42 };
      const result = buildEventProperties('token123', 'user123', 'insert123', additional);
      expect(result.custom).toBe('value');
      expect(result.number).toBe(42);
    });

    it('should include optional time and ip', () => {
      const result = buildEventProperties(
        'token123',
        'user123',
        'insert123',
        {},
        { time: 1700000000000, ip: '1.2.3.4' },
      );
      expect(result.time).toBe(1700000000);
      expect(result.ip).toBe('1.2.3.4');
    });
  });

  describe('Utils - buildProfileUpdate', () => {
    it('should build profile update object', () => {
      const properties = { name: 'John' };
      const result = buildProfileUpdate('token123', 'user123', '$set', properties);
      expect(result.$token).toBe('token123');
      expect(result.$distinct_id).toBe('user123');
      expect(result.$set).toEqual(properties);
    });

    it('should include optional ip and ignoreTime', () => {
      const result = buildProfileUpdate('token123', 'user123', '$set', {}, {
        ip: '1.2.3.4',
        ignoreTime: true,
      });
      expect(result.$ip).toBe('1.2.3.4');
      expect(result.$ignore_time).toBe(true);
    });
  });

  describe('Utils - buildGroupUpdate', () => {
    it('should build group update object', () => {
      const properties = { name: 'Acme Inc' };
      const result = buildGroupUpdate('token123', 'company', 'acme', '$set', properties);
      expect(result.$token).toBe('token123');
      expect(result.$group_key).toBe('company');
      expect(result.$group_id).toBe('acme');
      expect(result.$set).toEqual(properties);
    });
  });

  describe('Utils - splitIntoBatches', () => {
    it('should split array into batches', () => {
      const items = [1, 2, 3, 4, 5];
      const result = splitIntoBatches(items, 2);
      expect(result).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should return single batch for small arrays', () => {
      const items = [1, 2, 3];
      const result = splitIntoBatches(items, 5);
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should handle empty array', () => {
      const items: number[] = [];
      const result = splitIntoBatches(items, 2);
      expect(result).toEqual([]);
    });

    it('should handle exact batch size', () => {
      const items = [1, 2, 3, 4];
      const result = splitIntoBatches(items, 2);
      expect(result).toEqual([[1, 2], [3, 4]]);
    });
  });
});

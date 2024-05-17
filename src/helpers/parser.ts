/**
 * The Parser class is designed to convert query strings into structured objects 
 * of type FilterQuery, enabling structured data retrieval based on filter criteria.
 * This class plays a crucial role in applications where data needs to be fetched
 * or manipulated based on dynamic query inputs.
 *
 * Query Structure:
 * The general structure of a filter is defined as follows:
 *    filter=type:field:operator:value
 *
 * Type:
 * The 'type' parameter specifies the data type of the field being queried and 
 * supports the following options:
 *    - 's' (String): Textual data.
 *    - 'b' (Boolean): True or False values.
 *    - 'n' (Number): Numeric data.
 *    - 'd' (Date): Date values.
 *    - 'v' (Void): No data (used for null or undefined values).
 *
 * Field:
 * The 'field' represents the name of the data field the query targets. This is 
 * typically the column name in a database or the key in a JSON object.
 *
 * Operator:
 * Operators define the condition under which the field value is compared. The 
 * choice of operators is dependent on the 'type' specified. Supported operators include:
 *    - '=': Equal to.
 *    - '!=': Not equal to.
 *    - '>': Greater than.
 *    - '>=': Greater than or equal to.
 *    - '<': Less than.
 *    - '<=': Less than or equal to.
 *    - '><': Range (inclusive).
 *    - '>!<': Exclusive range.
 *    - '<>': Exists.
 *    - '<!>': Does not exist.
 *    - '!!': Boolean NOT.
 *    - '!': Not (used for negation).
 *
 * Value:
 * The 'value' parameter is restricted by the type of the field and the operator used. 
 * For example, Boolean types can only utilize the '=' and '!=' operators with 
 * the values 'true' or 'false':
 *    - 'b:verified:=:true': Checks if the 'verified' field is true.
 *    - 'b:verified:=:false': Checks if the 'verified' field is false.
 *    - 'b:verified:!=:true': Checks if the 'verified' field is not true.
 *    - 'b:verified:!=:false': Checks if the 'verified' field is not false.
 *
 * For data types like 'date' (d) or 'number' (n), applicable operators include
 * '=', '!=', '>', '>=', '<', '<=', and the range operators '><' and '>!<'. Range 
 * operators allow the specification of an inclusive or exclusive range using a 
 * specific format:
 *    - 'filter=type:field:operator:[lower,higher]': Defines a range between 'lower' 
 *      and 'higher' values, where the inclusivity or exclusivity is determined 
 *      by the operator.
 */


import {
  BooleanFilterQuery,
  DateFilterQuery,
  FilterQuery,
  NullFilterQuery,
  NumberFilterQuery,
  StringFilterQuery,
} from '../types/filter-query';

import { DataType } from '../enums/data-type.enum';
import { Operator } from '../enums/operator.enum';

import { ParserOptions } from '../interfaces/parser-options.interface';

export class Parser {
  private readonly defaults: ParserOptions = {
    allowedKeys: ['*'],
  };

  private buffer: FilterQuery[] = [];
  private filter: FilterQuery;
  private stack: string[];
  private chr: string;
  private escaped: boolean;

  constructor(private opts?: ParserOptions) {
    this.opts = { ...this.defaults };
  }

  private reset(): void {
    this.filter = <FilterQuery>{};
    this.escaped = false;
    this.chr = '';
    this.stack = [];
  }

  private isValidKey(target: string): boolean | undefined {
    return (
      this.opts?.allowedKeys.includes('*') ||
      this.opts?.allowedKeys.includes(target)
    );
  }

  private getFilterOperator(target: string): Operator {
    return Object.values(Operator).find((operator) => operator === target);
  }

  private getFilterType(target: string): DataType {
    return Object.values(DataType).find((type) => type === target);
  }

  private isRangeTypeOperator(op: Operator) {
    return Operator.between === op || Operator.notBetween === op;
  }

  private hasOneOfRangeTypeOperator(op: Operator | undefined) {
    return (
      Operator.eq === op ||
      Operator.ne === op ||
      Operator.gt === op ||
      Operator.gte === op ||
      Operator.lt === op ||
      Operator.lte === op ||
      Operator.in === op ||
      Operator.notIn === op
    );
  }

  private forStringTypeOperator(target: Operator) {
    return [
      Operator.eq,
      Operator.ne,
      Operator.in,
      Operator.notIn,
      Operator.regex,
      Operator.notRegex,
    ].some((op: Operator) => op == target);
  }

  private transform(filter: FilterQuery) {
    if (DataType.string === filter.type) {
      if (!this.forStringTypeOperator(filter.operator)) {
        throw new Error(`Unexpected operator ${filter.operator} for string`);
      }

      return <StringFilterQuery>{
        ...filter,
        ...(filter.multi
          ? {
              value: filter.value.split(filter.delimiter),
            }
          : {}),
      };
    }

    if (DataType.boolean === filter.type) {
      if (Operator.eq !== filter.operator && Operator.ne !== filter.operator) {
        throw new Error(`Unexpected operator ${filter.operator} for boolean`);
      }
      if (filter.value !== 'true' && filter.value !== 'false') {
        throw new Error(`Unexpected value ${filter.value} for boolean`);
      }

      return <BooleanFilterQuery>{
        ...filter,
        value: JSON.parse(filter.value),
      };
    }

    if (DataType.number === filter.type) {
      const nums = (<string>filter.value)
        .split(filter.delimiter)
        .map((num: string) => +num);

      if (nums.some((num: any) => isNaN(num))) {
        throw new Error(`Invalid value types`);
      }

      if ( !filter.multi ) {
        if ( nums?.length !== 1 ) {
          throw new Error(`Expecting 1 numeric value, ${nums.length} given`);
        }

        return <NumberFilterQuery>{ 
          ...filter, value: nums.pop()
        };
      }

      if (this.isRangeTypeOperator(filter.operator)) {
        if (nums.length !== 2) {
          throw new Error(
            `Wrong number of arguments, expects 2, ${nums.length} given`
          );
        }
      } else if (!this.hasOneOfRangeTypeOperator(filter.operator)) {
        throw new Error(
          `Invalid operator type ${filter.operator} for key type ${filter.field}`
        );
      }

      return <NumberFilterQuery>{
        ...filter,
        value: nums,
      };
    }

    if (DataType.date === filter.type) {
      const dates = (<string>filter.value)
        .split(filter.delimiter)
        .map((date: string) => Date.parse(date));

      if (dates.some((num: number) => isNaN(num))) {
        throw new Error(`Invalid value types`);
      }

      if ( !filter.multi ) {
        if ( dates?.length !== 1 ) {
          throw new Error(`Expecting 1 date, ${dates.length} given`);
        }

        return <DateFilterQuery>filter;
      }

      if (this.isRangeTypeOperator(filter.operator)) {
        if (dates.length !== 2) {
          throw new Error(
            `Wrong number of arguments, expects 2, ${dates.length} given`
          );
        }
      } else if (!this.hasOneOfRangeTypeOperator(filter.operator)) {
        throw new Error(
          `Invalid operator type ${filter.operator} for key type ${filter.field}`
        );
      }

      return <DateFilterQuery>{
        ...filter,
        value: dates,
      };
    }

    if (DataType.void === filter.type) {
      if (
        Operator.is !== filter.operator &&
        Operator.isNot !== filter.operator
      ) {
        throw new Error(
          `Invalid value type, expects true|false, ${filter.value} given`
        );
      }
      if (filter.value !== 'null' && filter.value !== 'undefined') {
        throw new Error(`Unexpected value ${filter.value} for boolean`);
      }

      return <NullFilterQuery>{
        ...filter,
        value: JSON.parse(filter.value),
      };
    }

    return filter;
  }

  public extract(str: string, options?: ParserOptions): FilterQuery[] {
    this.buffer = [];
    this.opts = {
      ...this.defaults,
      ...options,
    };

    this.reset();

    for (let i = 0; i < str.length; i++) {
      this.chr = str.charAt(i);
      if (this.chr === ':') {
        if (!this.escaped) {
          if (this.filter.multi) {
            throw new Error(
              'Malformed url, unbalanced parenthesis or brackets.'
            );
          }
          if (!this.filter.type) {
            this.filter.type = this.getFilterType(this.stack.join(''));
            if (!this.filter.type) {
              throw new Error(`'${this.filter.type}' is an invalid type`);
            }
          } else if (!this.filter.field) {
            this.filter.field = this.stack.join('');
            if (!this.isValidKey(this.filter.field)) {
              throw new Error(`'${this.filter.field}' is not an allowed key`);
            }
          } else if (!this.filter.operator) {
            this.filter.operator = this.getFilterOperator(this.stack.join(''));
            if (!this.filter.operator) {
              throw new Error(
                `'${this.filter.operator}' is an invalid operator`
              );
            }
          } else {
            throw new Error(`Unexpected character`);
          }

          this.stack = [];
        } else {
          this.stack.push(this.chr);
          this.escaped = false;
        }
      } else if (this.chr === '|' || this.chr === ',') {
        if (this.escaped) {
          throw new Error(`Invalid escaped character ${this.chr}`);
        }
        if (this.stack.length && !this.filter.multi) {
          if (this.filter.type && this.filter.field && !this.filter.operator) {
            throw new Error(
              `Malformed url: '${this.filter.type}' missing type`
            );
          }

          this.buffer.push(
            this.transform(<FilterQuery>{
              ...this.filter,
              value: this.stack.join(''),
            })
          );

          this.reset();
        } else if (this.filter.multi) {
          this.stack.push(this.chr);
        }
      } else if (this.chr === ']' || this.chr === ')') {
        if (this.escaped) {
          throw new Error(`Invalid escaped character ${this.chr}`);
        }

        this.buffer.push(
          this.transform(<FilterQuery>{
            ...this.filter,
            delimiter: this.chr === ')' ? '|' : ',',
            value: this.stack.join(''),
          })
        );

        this.reset();
      } else if (this.chr === '[' || this.chr === '(') {
        if (this.escaped) {
          throw new Error(`Invalid escaped character ${this.chr}`);
        }

        this.filter.multi = true;
        this.stack = [];
      } else if (this.chr === '\\') {
        this.escaped = true;
      } else {
        this.stack.push(this.chr);
      }
    }

    // Handle any remaining characters in the stack
    if (this.stack.length && (this.filter.field || this.filter.operator)) {
      if (this.filter.multi) {
        throw new Error('Malformed url, unbalanced parenthesis or brackets.');
      }

      this.buffer.push(
        this.transform(<FilterQuery>{
          ...this.filter,
          value: this.stack.join(''),
        })
      );
    }

    return this.buffer;
  }
}

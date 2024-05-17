import { Delimiter } from '../delimiter';
import { DataType } from '../enums/data-type.enum';
import { Operator } from '../enums/operator.enum';

export type FilterQuery =
  | StringFilterQuery
  | NumberFilterQuery
  | BooleanFilterQuery
  | DateFilterQuery
  | NullFilterQuery;

export type StringFilterQuery = {
  field: string;
  operator:
    | Operator.eq
    | Operator.ne
    | Operator.gt
    | Operator.gte
    | Operator.lt
    | Operator.lte
    | Operator.in
    | Operator.notIn
    | Operator.regex
    | Operator.notRegex;
  value: string;
  type: DataType.string;
  multi?: boolean;
  delimiter?: Delimiter;
};

export type NumberFilterQuery = {
  field: string;
  operator:
    | Operator.eq
    | Operator.ne
    | Operator.gt
    | Operator.gte
    | Operator.lt
    | Operator.lte
    | Operator.in
    | Operator.notIn
    | Operator.between
    | Operator.notBetween;
  value: string | number | [number];
  type: DataType.number;
  multi?: boolean;
  delimiter?: Delimiter;
};

export type BooleanFilterQuery = {
  field: string;
  operator: Operator.eq | Operator.ne;
  value: string | boolean;
  type: DataType.boolean;
  multi?: boolean;
  delimiter?: Delimiter;
};

export type DateFilterQuery = {
  field: string;
  operator:
    | Operator.eq
    | Operator.ne
    | Operator.gt
    | Operator.gte
    | Operator.lt
    | Operator.lte
    | Operator.in
    | Operator.notIn
    | Operator.between
    | Operator.notBetween;
  value: string | [number, number] | [Date, Date];
  type: DataType.date;
  multi?: boolean;
  delimiter?: Delimiter;
};

export type NullFilterQuery = {
  field: string;
  operator: Operator.is | Operator.isNot;
  value: string | null;
  type: DataType.void;
  multi?: boolean;
  delimiter?: Delimiter;
};

// export type ArrayFilterQuery = {
//     field: string;
//     operator: Operator.eq;
//     value: string;
//     type: FilterDataType.array;
// };

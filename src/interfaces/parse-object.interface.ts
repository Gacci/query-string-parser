import { Delimiter } from "../delimiter";
import { Operator } from "../enums/operator.enum";
import { Type } from "../enums/type.enum";

export interface ParseObject {
  multi?: Boolean;
  type?: Type | string | undefined;
  key?: String;
  op?: Operator | string | undefined;
  value?: any;
  delimiter?: Delimiter;
}

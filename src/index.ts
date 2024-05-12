import { Operator } from "./enums/operator.enum";
import { ParseObject } from "./interfaces/parse-object.interface";
import { ParserOptions } from "./interfaces/parser-options.interface";
import { Type } from "./enums/type.enum";

export class Parser {
  private readonly defaults: ParserOptions = {
    allowedKeys: ["*"],
  };

  private buffer: ParseObject[] = [];
  private stack: string[] = [];
  private multi: boolean = false;
  private chr: string;
  private type: Type | string;
  private key: string;
  private op: Operator | string;
  private value: string = "";

  constructor(private opts?: ParserOptions) {
    this.opts = { ...this.defaults };
  }

  private reset(): void {
    this.stack = [];
    this.multi = false;
    this.key = "";
    this.type = "";
    this.op = "";
    this.value = "";
  }

  private isValidKey(target: string): boolean | undefined {
    return (
      this.opts?.allowedKeys.includes("*") ||
      this.opts?.allowedKeys.includes(target)
    );
  }

  private isValidOperator(target: Operator): boolean {
    return Object.values(Operator).some((operator) => operator === target);
  }

  private isValidType(target: Type | undefined): boolean {
    return Object.values(Type).some((type) => type === target);
  }

  private isOfTypeRange(op: Operator | undefined) {
    return Operator.between === op || Operator.notBetween === op;
  }

  private isOneOfTypeRange(op: Operator | undefined) {
    return (
      Operator.eq === op ||
      Operator.ne === op ||
      Operator.gt === op ||
      Operator.gte === op ||
      Operator.lt === op ||
      Operator.lte === op
    );
  }

  private transform(object: ParseObject): ParseObject {
    if (Type.string === object.type) {
      if (
        Operator.eq !== object.op &&
        Operator.ne !== object.op &&
        Operator.like !== object.op &&
        Operator.notLike !== object.op
      ) {
        throw new Error(`Invalid operator for string values.`);
      }

      return {
        ...object,
        ...(object.multi
          ? {
              value: object.value.split(object.delimiter),
            }
          : {}),
      };
    }

    if (Type.boolean === object.type) {
      if (
        (Operator.eq === object.op || Operator.ne === object.op) &&
        (object.value !== "true" && object.value !== "false")
      ) {
        throw new Error(
          `Invalid value type, expects true|false, ${object.value} given`,
        );
      }

      return {
        ...object,
        value: JSON.parse(object.value),
      };
    }

    if (Type.number === object.type) {
      const nums = object.value.split(",").map((num: number) => +num);

      if (this.isOfTypeRange(<Operator>object.op)) {
        if (nums.length !== 2) {
          throw new Error(
            `Wrong number of arguments, expects 2, ${nums.length} given`,
          );
        }
      } else if (!this.isOneOfTypeRange(<Operator>object.op)) {
        throw new Error(
          `Invalid operator type ${object.op} for key type ${object.key}`,
        );
      }

      if (!nums.every((num: any) => !isNaN(num))) {
        throw new Error(`Invalid value types`);
      }

      return { ...object, value: nums };
    }

    if (Type.date === object.type) {
      const dates = object.value
        .split(",")
        .map((date: string) => Date.parse(date));

      if (this.isOfTypeRange(<Operator>object.op)) {
        if (dates.length !== 2) {
          throw new Error(
            `Wrong number of arguments, expects 2, ${dates.length} given`,
          );
        }
      } else if (!this.isOneOfTypeRange(<Operator>object.op)) {
        throw new Error(
          `Invalid operator type ${object.op} for key type ${object.key}`,
        );
      }

      if (!dates.every((num: number) => !isNaN(num))) {
        throw new Error(`Invalid value types`);
      }

      return { ...object, value: dates };
    }

    if (Type.void === object.type) {
      if (
        (Operator.is === object.op || Operator.isNot === object.op) &&
        (object.value !== "null" && object.value !== "undefined")
      ) {
        throw new Error(
          `Invalid value type, expects true|false, ${object.value} given`,
        );
      }

      return {
        ...object,
        value: JSON.parse(object.value),
      };
    }

    return object;
  }

  public exec(str: string, options?: ParserOptions): ParseObject[] {
    this.stack = [];
    this.chr = "";
    this.opts = {
      ...this.defaults,
      ...options,
    };

    this.reset();

    for (let i = 0; i < str.length; i++) {
      this.chr = str.charAt(i);
      if (this.chr === ":") {
        if (this.multi) {
          throw new Error("Malformed url, unbalanced parenthesis or brackets.");
        }
        if (!this.type.length) {
          this.type = this.stack.join("");
          if (!this.isValidType(<Type>this.type)) {
            throw new Error(`'${this.type}' is an invalid type`);
          }
        } else if (!this.key.length) {
          this.key = this.stack.join("");
          if (!this.isValidKey(this.key)) {
            throw new Error(`'${this.key}' is not an allowed key`);
          }
        } else {
          this.op = this.stack.join("");
          if (!this.isValidOperator(<Operator>this.op)) {
            throw new Error(`'${this.op}' is an invalid operator`);
          }
        }

        this.stack = [];
      } else if (this.chr === "[" || this.chr === "(") {
        this.multi = true;
        this.stack = [];
      } else if (this.chr === "]" || this.chr === ")") {
        this.buffer.push(
          this.transform({
            multi: this.multi,
            type: this.type,
            key: this.key,
            op: this.op,
            delimiter: this.chr === ")" ? "|" : ",",
            value: this.stack.join(""),
          }),
        );

        this.reset();
      } else if (this.chr === "|" || this.chr === ",") {
        if (this.stack.length && !this.multi) {
          if (this.type.length && this.key.length && !this.op.length) {
            throw new Error(`Malformed url: '${this.type}' missing type`);
          }

          this.buffer.push(
            this.transform({
              multi: this.multi,
              type: this.type,
              key: this.key,
              op: this.op,
              value: this.stack.join(""),
            }),
          );

          this.reset();
        } else if (this.multi) {
          this.stack.push(this.chr);
        }
      } else {
        this.stack.push(this.chr);
      }
    }

    // Handle any remaining characters in the stack
    if (this.stack.length && (this.key || this.op)) {
      this.buffer.push(
        this.transform({
          multi: this.multi,
          type: this.type,
          key: this.key,
          op: this.op,
          value: this.stack.join(""),
        }),
      );
    }

    return this.buffer;
  }
}

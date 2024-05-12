"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const operator_enum_1 = require("./enums/operator.enum");
const type_enum_1 = require("./enums/type.enum");
class Parser {
    constructor(opts) {
        this.opts = opts;
        this.defaults = {
            allowedKeys: ["*"],
        };
        this.buffer = [];
        this.stack = [];
        this.multi = false;
        this.value = "";
        this.opts = Object.assign({}, this.defaults);
    }
    reset() {
        this.stack = [];
        this.multi = false;
        this.key = "";
        this.type = "";
        this.op = "";
        this.value = "";
    }
    isValidKey(target) {
        var _a, _b;
        return (((_a = this.opts) === null || _a === void 0 ? void 0 : _a.allowedKeys.includes("*")) ||
            ((_b = this.opts) === null || _b === void 0 ? void 0 : _b.allowedKeys.includes(target)));
    }
    isValidOperator(target) {
        return Object.values(operator_enum_1.Operator).some((operator) => operator === target);
    }
    isValidType(target) {
        return Object.values(type_enum_1.Type).some((type) => type === target);
    }
    isOfTypeRange(op) {
        return operator_enum_1.Operator.between === op || operator_enum_1.Operator.notBetween === op;
    }
    isOneOfTypeRange(op) {
        return (operator_enum_1.Operator.eq === op ||
            operator_enum_1.Operator.ne === op ||
            operator_enum_1.Operator.gt === op ||
            operator_enum_1.Operator.gte === op ||
            operator_enum_1.Operator.lt === op ||
            operator_enum_1.Operator.lte === op);
    }
    transform(object) {
        if (type_enum_1.Type.string === object.type) {
            if (operator_enum_1.Operator.eq !== object.op &&
                operator_enum_1.Operator.ne !== object.op &&
                operator_enum_1.Operator.like !== object.op &&
                operator_enum_1.Operator.notLike !== object.op) {
                throw new Error(`Invalid operator for string values.`);
            }
            return Object.assign(Object.assign({}, object), (object.multi
                ? {
                    value: object.value.split(object.delimiter),
                }
                : {}));
        }
        if (type_enum_1.Type.boolean === object.type) {
            if ((operator_enum_1.Operator.eq === object.op || operator_enum_1.Operator.ne === object.op) &&
                (object.value !== "true" && object.value !== "false")) {
                throw new Error(`Invalid value type, expects true|false, ${object.value} given`);
            }
            return Object.assign(Object.assign({}, object), { value: JSON.parse(object.value) });
        }
        if (type_enum_1.Type.number === object.type) {
            const nums = object.value.split(",").map((num) => +num);
            if (this.isOfTypeRange(object.op)) {
                if (nums.length !== 2) {
                    throw new Error(`Wrong number of arguments, expects 2, ${nums.length} given`);
                }
            }
            else if (!this.isOneOfTypeRange(object.op)) {
                throw new Error(`Invalid operator type ${object.op} for key type ${object.key}`);
            }
            if (!nums.every((num) => !isNaN(num))) {
                throw new Error(`Invalid value types`);
            }
            return Object.assign(Object.assign({}, object), { value: nums });
        }
        if (type_enum_1.Type.date === object.type) {
            const dates = object.value
                .split(",")
                .map((date) => Date.parse(date));
            if (this.isOfTypeRange(object.op)) {
                if (dates.length !== 2) {
                    throw new Error(`Wrong number of arguments, expects 2, ${dates.length} given`);
                }
            }
            else if (!this.isOneOfTypeRange(object.op)) {
                throw new Error(`Invalid operator type ${object.op} for key type ${object.key}`);
            }
            if (!dates.every((num) => !isNaN(num))) {
                throw new Error(`Invalid value types`);
            }
            return Object.assign(Object.assign({}, object), { value: dates });
        }
        if (type_enum_1.Type.void === object.type) {
            if ((operator_enum_1.Operator.is === object.op || operator_enum_1.Operator.isNot === object.op) &&
                (object.value !== "null" && object.value !== "undefined")) {
                throw new Error(`Invalid value type, expects true|false, ${object.value} given`);
            }
            return Object.assign(Object.assign({}, object), { value: JSON.parse(object.value) });
        }
        return object;
    }
    exec(str, options) {
        this.stack = [];
        this.chr = "";
        this.opts = Object.assign(Object.assign({}, this.defaults), options);
        this.reset();
        for (let i = 0; i < str.length; i++) {
            this.chr = str.charAt(i);
            if (this.chr === ":") {
                if (this.multi) {
                    throw new Error("Malformed url, unbalanced parenthesis or brackets.");
                }
                if (!this.type.length) {
                    this.type = this.stack.join("");
                    if (!this.isValidType(this.type)) {
                        throw new Error(`'${this.type}' is an invalid type`);
                    }
                }
                else if (!this.key.length) {
                    this.key = this.stack.join("");
                    if (!this.isValidKey(this.key)) {
                        throw new Error(`'${this.key}' is not an allowed key`);
                    }
                }
                else {
                    this.op = this.stack.join("");
                    if (!this.isValidOperator(this.op)) {
                        throw new Error(`'${this.op}' is an invalid operator`);
                    }
                }
                this.stack = [];
            }
            else if (this.chr === "[" || this.chr === "(") {
                this.multi = true;
                this.stack = [];
            }
            else if (this.chr === "]" || this.chr === ")") {
                this.buffer.push(this.transform({
                    multi: this.multi,
                    type: this.type,
                    key: this.key,
                    op: this.op,
                    delimiter: this.chr === ")" ? "|" : ",",
                    value: this.stack.join(""),
                }));
                this.reset();
            }
            else if (this.chr === "|" || this.chr === ",") {
                if (this.stack.length && !this.multi) {
                    if (this.type.length && this.key.length && !this.op.length) {
                        throw new Error(`Malformed url: '${this.type}' missing type`);
                    }
                    this.buffer.push(this.transform({
                        multi: this.multi,
                        type: this.type,
                        key: this.key,
                        op: this.op,
                        value: this.stack.join(""),
                    }));
                    this.reset();
                }
                else if (this.multi) {
                    this.stack.push(this.chr);
                }
            }
            else {
                this.stack.push(this.chr);
            }
        }
        // Handle any remaining characters in the stack
        if (this.stack.length && (this.key || this.op)) {
            this.buffer.push(this.transform({
                multi: this.multi,
                type: this.type,
                key: this.key,
                op: this.op,
                value: this.stack.join(""),
            }));
        }
        return this.buffer;
    }
}
exports.Parser = Parser;

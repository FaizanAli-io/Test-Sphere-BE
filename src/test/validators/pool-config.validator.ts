import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { QuestionType } from "../../typeorm/entities";

@ValidatorConstraint({ name: "IsValidPoolConfig", async: false })
export class IsValidPoolConfig implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;

    const allowedTypes = new Set(Object.values(QuestionType));

    for (const [k, v] of Object.entries(value)) {
      if (!allowedTypes.has(k as QuestionType)) return false;
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) return false;
    }

    return true;
  }

  defaultMessage(_args: ValidationArguments) {
    return `config must be an object with keys from QuestionType and non-negative integer values`;
  }
}

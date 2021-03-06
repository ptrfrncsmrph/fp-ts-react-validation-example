import {
  Either,
  fromPredicate,
  chain,
  getValidation,
  mapLeft,
} from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/pipeable"
import * as NEA from "fp-ts/lib/ReadonlyNonEmptyArray"
import { sequenceT, sequenceS } from "fp-ts/lib/Apply"
import { reader } from "fp-ts/lib/Reader"

import { ValidationError, isoEmail, isoPassword } from "src/simple/Simple.types"
import { sequence_ } from "src/lib/Foldable"

const { getSemigroup, readonlyNonEmptyArray } = NEA

export const validateLength = ({ min, max }: { min: number; max: number }) => (
  str: string,
): Either<ValidationError, string> =>
  pipe(
    str,
    fromPredicate(
      str => str.length > 0,
      () => ValidationError.EmptyField,
    ),
    chain(
      fromPredicate(
        str => str.length >= min,
        () => ValidationError.TooShort,
      ),
    ),
    chain(
      // Not sure why I need to include this annotation
      fromPredicate<ValidationError, string>(
        str => str.length <= max,
        () => ValidationError.TooLong,
      ),
    ),
  )

const V = getValidation(getSemigroup<ValidationError>())

const passwordValidators = sequenceT(reader)(
  validateLength({ min: 4, max: 24 }),
  fromPredicate(
    (str: string) => specialCharsRegExp.test(str),
    () => ValidationError.NoSpecialChar,
  ),
)

const specialCharsRegExp: RegExp = /[!@#$%^&*)(+=._-]/g

const validatePassword = (str: string) =>
  pipe(
    passwordValidators(str),
    NEA.map(mapLeft(readonlyNonEmptyArray.of)),
    sequence_(V, readonlyNonEmptyArray),
    chain(() => pipe(str, isoPassword.wrap, V.of)),
  )

export const emailValidators = sequenceT(reader)(
  validateLength({ min: 6, max: 30 }),
  fromPredicate(
    (str: string) => str.includes("@"),
    () => ValidationError.InvalidEmail,
  ),
)

const validateEmail = (str: string) =>
  pipe(
    emailValidators(str),
    NEA.map(mapLeft(readonlyNonEmptyArray.of)),
    sequence_(V, readonlyNonEmptyArray),
    chain(() => pipe(str, isoEmail.wrap, V.of)),
  )

export const validateForm = (form: { email: string; password: string }) =>
  sequenceS(V)({
    email: validateEmail(form.email),
    password: validatePassword(form.password),
  })

import React, { ReactNode, useState } from "react"
import { some, fold as optionFold } from "fp-ts/lib/Option"
import { Lens } from "monocle-ts"
import { pipe } from "fp-ts/lib/pipeable"
import { sequenceS } from "fp-ts/lib/Apply"

import {
  FormBuilder,
  focus,
  formBuilder,
  withValue,
  mapUI,
} from "src/lib/FormBuilder"
import {
  validated,
  nonEmpty,
  Validated,
  mustEqual,
  isValidEmail,
} from "src/lib/Validator"
import { Label, Main } from "src/simple/Simple.styles"
import { eqString } from "fp-ts/lib/Eq"

type RegistrationFormData = {
  email: Validated<string>
  password: Validated<string>
  passwordConfirmation: Validated<string>
}

const mkPersonFormLens = Lens.fromProp<RegistrationFormData>()
const emailLens = mkPersonFormLens("email")
const passwordLens = mkPersonFormLens("password")
const passwordConfirmationLens = mkPersonFormLens("passwordConfirmation")

const textInput = ({
  label,
  type = "text",
}: {
  label: string
  type?: "password" | "text"
}): FormBuilder<Validated<string>, string> => input => ({
  ui: handleChange => (
    <Label>
      <span>{label}</span>
      <input
        type={type}
        onChange={e => handleChange({ ...input, value: e.target.value })}
        onBlur={() => handleChange({ ...input, blurred: true })}
        onFocus={() => handleChange({ ...input, blurred: false })}
      />
    </Label>
  ),
  result: some(input.value),
})

const registrationForm: FormBuilder<
  RegistrationFormData,
  ReactNode
> = sequenceS(formBuilder)({
  email: pipe(
    textInput({ label: "Email" }),
    validated(nonEmpty("Email")),
    validated(isValidEmail),
    focus(emailLens),
    mapUI(ui => <div>{ui}</div>),
  ),
  password: pipe(
    textInput({ label: "Password", type: "password" }),
    validated(nonEmpty("Password")),
    focus(passwordLens),
    mapUI(ui => <div>{ui}</div>),
  ),
  passwordConfirmation: withValue(({ password }) =>
    pipe(
      textInput({ label: "Confirm password", type: "password" }),
      validated(nonEmpty("Password")),
      validated(mustEqual(eqString)(password.value, "Passwords must match")),
      focus(passwordConfirmationLens),
      mapUI(ui => <div>{ui}</div>),
    ),
  ),
})

const emptyValidatedString = {
  value: "",
  modified: false,
  blurred: false,
}

export function PersonForm() {
  const [registration, setRegistration] = useState({
    email: emptyValidatedString,
    password: emptyValidatedString,
    passwordConfirmation: emptyValidatedString,
  })
  return (
    <Main>
      <h1>Registration form</h1>
      <form>
        <div>{registrationForm(registration).ui(setRegistration)}</div>
        <div>
          {pipe(
            registrationForm(registration).result,
            optionFold(
              () => "Invalid form",
              r => JSON.stringify(r, null, 2),
            ),
          )}
        </div>
      </form>
    </Main>
  )
}

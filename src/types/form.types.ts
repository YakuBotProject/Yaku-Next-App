// src/types/form.types.ts

import { LoginFormInputs, RegisterFormInputs } from './auth.types'

export type FormInputs = LoginFormInputs | RegisterFormInputs

export interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
}

export interface SubmitResponse {
  success: boolean
  message: string
  redirectUrl?: string
}

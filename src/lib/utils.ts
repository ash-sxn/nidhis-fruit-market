import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const INR_FORMATTER = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatInrFromCents(cents: number) {
  return INR_FORMATTER.format(cents / 100)
}

// Curated list of common Nigerian banks with their NIP/CBN codes, for the
// settlement-account picker. Not exhaustive (a live build would fetch Monnify's
// bank list); covers the major banks plus a few fintechs for the demo. Codes are
// the 3-digit CBN codes for banks and the longer NIP codes for fintechs.
export interface Bank {
  code: string;
  name: string;
}

export const BANKS: Bank[] = [
  { code: '044', name: 'Access Bank' },
  { code: '050', name: 'Ecobank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '082', name: 'Keystone Bank' },
  { code: '50515', name: 'Moniepoint MFB' },
  { code: '999992', name: 'OPay' },
  { code: '999991', name: 'PalmPay' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '50211', name: 'Kuda' },
];

export function bankName(code: string | null | undefined): string | null {
  if (!code) return null;
  return BANKS.find((b) => b.code === code)?.name ?? null;
}

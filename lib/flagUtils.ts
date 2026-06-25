const FLAG_MAP: Record<string, string> = {
  Argentina: 'AR', France: 'FR', Poland: 'PL', Mexico: 'MX',
  Spain: 'ES', Germany: 'DE', Japan: 'JP', 'Costa Rica': 'CR',
  Brazil: 'BR', England: 'GB', Serbia: 'RS', Switzerland: 'CH',
  Italy: 'IT', Netherlands: 'NL', Belgium: 'BE', Canada: 'CA',
  Portugal: 'PT', Uruguay: 'UY', 'South Korea': 'KR', Ghana: 'GH',
  Croatia: 'HR', Morocco: 'MA', Denmark: 'DK', Australia: 'AU',
  Senegal: 'SN', Ecuador: 'EC', Qatar: 'QA', Iran: 'IR',
  'Saudi Arabia': 'SA', Tunisia: 'TN', Peru: 'PE', 'New Zealand': 'NZ',
  Colombia: 'CO', Nigeria: 'NG', Chile: 'CL', Turkey: 'TR',
  USA: 'US', Egypt: 'EG', Panama: 'PA', Algeria: 'DZ',
  Austria: 'AT', 'Ivory Coast': 'CI', Bolivia: 'BO', Iraq: 'IQ',
  Jamaica: 'JM', China: 'CN', Greece: 'GR', Indonesia: 'ID',
  Wales: 'GB', Iceland: 'IS', Russia: 'RU', Sweden: 'SE',
  Norway: 'NO', Scotland: 'GB', Yugoslavia: 'RS', Romania: 'RO',
  Bulgaria: 'BG', Paraguay: 'PY', Honduras: 'HN', 'South Africa': 'ZA',
  Slovenia: 'SI', Slovakia: 'SK', 'Trinidad & Tobago': 'TT', Angola: 'AO',
  Togo: 'TG', Ukraine: 'UA', 'Czech Republic': 'CZ', 'North Korea': 'KP',
  Cameroon: 'CM', Ireland: 'IE', 'Republic of Ireland': 'IE', Bosnia: 'BA',
  'Bosnia-Herzegovina': 'BA', 'Bosnia & Herzegovina': 'BA',
  'United States': 'US', 'Cameroun': 'CM', Kuwait: 'KW', 'New Caledonia': 'NC',
  Uzbekistan: 'UZ', Venezuela: 'VE', Haiti: 'HT', Kenya: 'KE',
  Cuba: 'CU', 'El Salvador': 'SV', Guatemala: 'GT', 'Burkina Faso': 'BF',
  'DR Congo': 'CD', Mali: 'ML', Niger: 'NE', Tanzania: 'TZ',
  Thailand: 'TH', Vietnam: 'VN', Philippines: 'PH', Malaysia: 'MY',
  Palestine: 'PS', Jordan: 'JO', Syria: 'SY', Lebanon: 'LB',
  Georgia: 'GE', Albania: 'AL', Kosovo: 'XK', 'North Macedonia': 'MK',
  Finland: 'FI', Hungary: 'HU', 'Cyprus': 'CY',
}

export function teamFlagCode(name: string): string {
  return FLAG_MAP[name] ?? 'UN'
}

export function flagEmoji(code: string): string {
  if (!code || code === 'UN') return '🏳'
  // Take first 2 chars only (handles GB-ENG → GB)
  const c = code.slice(0, 2).toUpperCase()
  return c.split('').map(ch => String.fromCodePoint(127397 + ch.charCodeAt(0))).join('')
}

export function teamFlagEmoji(name: string): string {
  return flagEmoji(teamFlagCode(name))
}

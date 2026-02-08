import { fetchCaddsHtml } from './cadds_fetch'
import { parseCadds } from './cadds_parse'

export async function ingestDiuCadds(url: string) {
  const { html } = await fetchCaddsHtml(url)
  return parseCadds({ url, html })
}

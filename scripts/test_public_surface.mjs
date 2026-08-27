import { readFile } from 'node:fs/promises'

const required = [
  'README.md', 'LICENSE', 'SECURITY.md', 'SUPPORT.md', 'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md', '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/integration_case.yml',
  '.github/pull_request_template.md', 'docs/quickstart.md',
  'docs/launch/community-posts.md', 'docs/launch/faq.md',
  'docs/launch/launch-article.md', 'docs/launch/launch-manifest.json',
]
for (const path of required) await readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const manifest = JSON.parse(await readFile(new URL('../docs/launch/launch-manifest.json', import.meta.url), 'utf8'))
if (manifest.release !== 'v0.1.1') throw new Error('launch manifest release mismatch')
const ids = manifest.channels.map(channel => channel.id)
if (new Set(ids).size !== ids.length) throw new Error('duplicate launch channel id')
for (const id of ['github-release', 'github-pages', 'github-discussion', 'github-issues', 'reddit', 'x', 'linkedin']) {
  if (!ids.includes(id)) throw new Error(`launch manifest missing ${id}`)
}

process.stdout.write('public surface tests passed\n')

import { readFile } from 'node:fs/promises'

const required = [
  'README.md', 'LICENSE', 'SECURITY.md', 'SUPPORT.md', 'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md', '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/integration_case.yml',
  '.github/pull_request_template.md', '.github/workflows/publish-npm.yml',
  'docs/quickstart.md',
  'docs/launch/community-posts.md', 'docs/launch/faq.md',
  'docs/launch/launch-article.md', 'docs/launch/launch-manifest.json',
]
for (const path of required) await readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')
const quickstart = await readFile(new URL('../docs/quickstart.md', import.meta.url), 'utf8')
const chineseGuide = await readFile(new URL('../docs/README.zh-CN.md', import.meta.url), 'utf8')
const site = await readFile(new URL('../site/index.html', import.meta.url), 'utf8')
const launchArticle = await readFile(new URL('../docs/launch/launch-article.md', import.meta.url), 'utf8')
const showcase = await readFile(new URL('../docs/launch/showcase-submission.md', import.meta.url), 'utf8')
const communityPosts = await readFile(new URL('../docs/launch/community-posts.md', import.meta.url), 'utf8')
const npmInstall = 'dsh plugin --profile web add dsh-typelens'
const npmUpgrade = 'dsh plugin --profile web update dsh-typelens --latest'
for (const [label, surface] of [
  ['README', readme],
  ['quickstart', quickstart],
  ['Chinese guide', chineseGuide],
  ['site', site],
  ['launch article', launchArticle],
  ['showcase submission', showcase],
  ['community posts', communityPosts],
]) {
  if (!surface.includes(npmInstall)) throw new Error(`${label} missing canonical npm install command`)
  if (!surface.includes(npmUpgrade)) throw new Error(`${label} missing canonical npm upgrade command`)
}

const publish = await readFile(new URL('../.github/workflows/publish-npm.yml', import.meta.url), 'utf8')
for (const requiredText of ['release:', 'types: [published]', 'id-token: write', 'pnpm verify', 'npm publish --access public --provenance']) {
  if (!publish.includes(requiredText)) throw new Error(`npm publish workflow missing ${requiredText}`)
}
for (const forbidden of ['NPM_TOKEN', 'NODE_AUTH_TOKEN']) {
  if (publish.includes(forbidden)) throw new Error(`npm publish workflow must not use ${forbidden}`)
}

const manifest = JSON.parse(await readFile(new URL('../docs/launch/launch-manifest.json', import.meta.url), 'utf8'))
if (manifest.release !== 'v0.1.1') throw new Error('launch manifest release mismatch')
const ids = manifest.channels.map(channel => channel.id)
if (new Set(ids).size !== ids.length) throw new Error('duplicate launch channel id')
for (const id of ['github-release', 'github-pages', 'github-discussion', 'github-issues', 'reddit', 'x', 'linkedin']) {
  if (!ids.includes(id)) throw new Error(`launch manifest missing ${id}`)
}

process.stdout.write('public surface tests passed\n')

#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_dir="$(cd "$script_dir/.." && pwd -P)"
index="$repo_dir/site/index.html"

[[ -f "$index" && -f "$repo_dir/site/styles.css" && -f "$repo_dir/site/typelens-flow.svg" && -f "$repo_dir/site/404.html" ]]
[[ "$(grep -Eoc '<h1([ >])' "$index")" -eq 1 ]]
for landmark in header main footer nav; do grep -Eq "<$landmark([ >])" "$index"; done
grep -Fq 'Give coding Agents the type context they were missing.' "$index"
grep -Fq 'name="viewport"' "$index"
grep -Fq 'docs/quickstart.md' "$index"
grep -Fq 'releases/latest' "$index"
grep -Fq 'github.com/fantasyce/dsh-typelens' "$index"
grep -Fq '<title' "$repo_dir/site/typelens-flow.svg"
grep -Fq '<desc' "$repo_dir/site/typelens-flow.svg"
grep -Fq 'actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d' "$repo_dir/.github/workflows/pages.yml"
grep -Fq 'actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9' "$repo_dir/.github/workflows/pages.yml"
grep -Fq 'actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128' "$repo_dir/.github/workflows/pages.yml"

if rg -n 'https?://[^" ]+\.(js|css|woff2?|ttf)|<script|googletag|segment\.com|plausible|analytics|href="#"|TODO|PLACEHOLDER' "$repo_dir/site"; then
  echo 'site contains an external dependency, tracker, script, or placeholder' >&2
  exit 1
fi

echo 'site tests passed'

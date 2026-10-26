#!/usr/bin/env bash
# Deploy sekali jalan: buat repo GitHub (bila belum ada), push, aktifkan Pages via GitHub Actions,
# tunggu workflow selesai, cetak alamat dashboard.
# Pemakaian: ./deploy.sh [nama-repo]   (bawaan: up3-masohi-dashboard)
set -euo pipefail

REPO="${1:-up3-masohi-dashboard}"

command -v git >/dev/null || { echo "git belum terpasang: https://git-scm.com"; exit 1; }
command -v gh  >/dev/null || { echo "GitHub CLI (gh) belum terpasang: https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || gh auth login --web --git-protocol https

OWNER="$(gh api user -q .login)"
echo "Akun GitHub: $OWNER  |  Repo: $REPO"

if [ ! -d .git ]; then git init -q; fi
git checkout -q -B main
git add -A
git commit -qm "Dashboard kinerja harian UP3 Masohi" || true

if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
  git push -u origin main
else
  gh repo create "$REPO" --public --source=. --remote=origin --push
fi

# Sumber Pages = GitHub Actions (workflow .github/workflows/deploy-pages.yml)
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
  || gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 || true

echo "Menunggu workflow deploy..."
for i in $(seq 1 12); do
  RUN_ID="$(gh run list --repo "$OWNER/$REPO" --workflow "Deploy ke GitHub Pages" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)"
  [ -n "$RUN_ID" ] && break
  sleep 5
done
if [ -n "${RUN_ID:-}" ]; then
  gh run watch --repo "$OWNER/$REPO" --exit-status "$RUN_ID" || { echo "Workflow gagal; lihat: https://github.com/$OWNER/$REPO/actions"; exit 1; }
else
  echo "Workflow belum muncul; jalankan ulang nanti: gh workflow run 'Deploy ke GitHub Pages' --repo $OWNER/$REPO"
fi

URL="https://$OWNER.github.io/$REPO/"
echo
echo "Dashboard aktif di: $URL"
echo "Cek: curl -sI $URL | head -1"

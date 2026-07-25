#!/usr/bin/env bash
# =============================================================================
#  ForgeBound — launcher
#
#  First time only:   chmod +x launch.sh
#
#  Usage:
#    ./launch.sh              build if needed, then open the game in a browser
#    ./launch.sh --serve      serve over http://localhost:4173 and open it
#                             (use this if your browser blocks saves on file://)
#    ./launch.sh --rebuild    force a fresh build before launching
#    ./launch.sh --help       show this help
#
#  Runs 100% offline. The whole game compiles to a single dist/index.html —
#  that one file (plus this script) is all you need on any machine.
# =============================================================================
set -u

PORT=4173
DIR="$(cd "$(dirname "${BASH_SOURCE:-$0}")" && pwd)"
cd "$DIR" || exit 1

ARTIFACT="dist/index.html"
URL="http://localhost:$PORT/"

# --- output helpers ----------------------------------------------------------
if [[ -t 1 ]]; then
  GOLD=$'\033[38;5;220m'; GREEN=$'\033[32m'; RED=$'\033[31m'
  DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  GOLD=""; GREEN=""; RED=""; DIM=""; BOLD=""; RESET=""
fi

ok()   { echo " ${GREEN}✓${RESET} $1"; }
note() { echo " ${DIM}· $1${RESET}"; }
warn() { echo " ${GOLD}!${RESET} $1"; }
fail() { echo " ${RED}✗ $1${RESET}"; exit 1; }

# Files the build cannot do without — checked before we waste a build cycle.
REQUIRED_FILES=(
  index.html package.json vite.config.ts tsconfig.json
  src/main.tsx src/App.tsx src/index.css
  src/game/types.ts src/game/xp.ts src/game/audio.ts src/game/map.ts
  src/game/data.ts src/game/pathfinding.ts src/game/render.ts src/game/useGame.ts
  src/components/ItemIcon.tsx src/components/WorldCanvas.tsx src/components/Minimap.tsx
  src/components/EventFeed.tsx src/components/XpOrbs.tsx src/components/SidePanels.tsx
  src/components/Modals.tsx src/components/LevelUpOverlay.tsx src/components/LoginScreen.tsx
)

preflight() {
  local missing=()
  for f in "${REQUIRED_FILES[@]}"; do
    [[ -f "$f" ]] || missing+=("$f")
  done
  if (( ${#missing[@]} )); then
    warn "This copy of the project is incomplete — missing:"
    for f in "${missing[@]}"; do echo "     ${RED}·${RESET} $f"; done
    fail "Re-copy the full project folder (all of src/ plus the root config files) and try again."
  fi
  ok "Project tree complete (${#REQUIRED_FILES[@]}/${#REQUIRED_FILES[@]} required files)"
}

usage() {
  sed -n '2,17p' "$0" | sed 's/^# \{0,2\}//'
}

banner() {
  echo
  echo "${BOLD}${GOLD}   ⚒  F O R G E B O U N D${RESET}"
  echo "${DIM}      an offline realm — single-file build${RESET}"
  echo
}

# --- building ------------------------------------------------------------------
build() {
  command -v npm >/dev/null 2>&1 \
    || fail "npm not found. Install Node.js once, or copy a prebuilt dist/ next to this script."
  [[ -d node_modules ]] \
    || fail "node_modules is missing. Run 'npm install' once while you still have signal."
  note "Building single-file game (offline)…"
  npm run build >/dev/null 2>&1 || fail "Build failed — run 'npm run build' by hand to see why."
  ok "Built ${ARTIFACT}"
}

# --- opening -------------------------------------------------------------------
open_target() { # $1 = file path or URL
  local target="$1"
  case "$(uname -s)" in
    Darwin)
      command -v open >/dev/null 2>&1 && open "$target" && return 0 ;;
    Linux)
      if [[ -n "${WSL_DISTRO_NAME:-}" || -n "${WSLENV:-}" ]]; then
        # WSL: translate to a Windows path for files, use the Windows browser for URLs
        if command -v wslview >/dev/null 2>&1; then
          [[ "$target" == http* ]] && wslview "$target" || wslview "$(wslpath -w "$target")"
          return 0
        elif command -v explorer.exe >/dev/null 2>&1; then
          [[ "$target" == http* ]] || target="$(wslpath -w "$target")"
          explorer.exe "$target" >/dev/null 2>&1 &
          return 0
        fi
      elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$target" >/dev/null 2>&1 &
        return 0
      fi ;;
  esac
  return 1
}

# --- zero-dependency local server (python3, node as fallback) --------------------
serve() {
  local pid=""
  if command -v python3 >/dev/null 2>&1; then
    python3 -m http.server "$PORT" --bind 127.0.0.1 --directory dist >/dev/null 2>&1 &
    pid=$!
  elif command -v node >/dev/null 2>&1; then
    node - >/dev/null 2>&1 <<'JS' &
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(process.cwd(), "dist");
http.createServer((req, res) => {
  let file = path.normalize(path.join(root, req.url.split("?")[0]));
  if (!file.startsWith(root)) file = root;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": file.endsWith(".html") ? "text/html" : "application/octet-stream" });
    res.end(data);
  });
}).listen(4173, "127.0.0.1", () => console.log("ready"));
JS
    pid=$!
  else
    fail "--serve needs python3 or node on this machine."
  fi

  sleep 0.7
  kill -0 "$pid" 2>/dev/null || fail "Could not start server — is port $PORT already in use?"
  ok "Serving at ${BOLD}${URL}${RESET}  ${DIM}(Ctrl+C to stop the realm)${RESET}"
  open_target "$URL" || note "Open it by hand: ${URL}"
  trap 'kill "$pid" 2>/dev/null' INT TERM EXIT
  wait "$pid"
}

# --- main -----------------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    -h|--help) usage; exit 0 ;;
    --serve)   SERVE=1 ;;
    --rebuild) REBUILD=1 ;;
    *) echo "Unknown option: $arg"; usage; exit 1 ;;
  esac
done
SERVE="${SERVE:-0}"
REBUILD="${REBUILD:-0}"

banner
preflight

if [[ "$REBUILD" -eq 1 || ! -f "$ARTIFACT" ]]; then
  [[ -f "$ARTIFACT" ]] || note "No build found — building first."
  build
else
  ok "Found ${ARTIFACT} ${DIM}($(du -h "$ARTIFACT" | cut -f1))${RESET}"
fi

if [[ "$SERVE" -eq 1 ]]; then
  serve
  exit 0
fi

if open_target "$DIR/$ARTIFACT"; then
  ok "Launched from ${BOLD}${DIR}/${ARTIFACT}${RESET}"
  note "Saves live in this browser's local storage — same machine, same browser."
else
  warn "No browser opener detected on this machine — falling back to local server."
  serve
fi

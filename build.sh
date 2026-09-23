#!/bin/bash
# Compila la landing (src/*.jsx) a un solo app.js minificado, sin Babel en el navegador.
# Uso: ./build.sh   (después: commit + push; Pages publica el repo tal cual)
set -euo pipefail
cd "$(dirname "$0")"
ESBUILD="${ESBUILD:-../doppel-clientes/node_modules/.bin/esbuild}"
TMP=$(mktemp)
# Cada archivo va en su propio IIFE (antes eran <script> separados); se comunican por window.
for f in src/track.jsx src/shared.jsx src/booking.jsx src/landing.jsx; do
  printf '(function(){\n' >> "$TMP"; cat "$f" >> "$TMP"; printf '\n})();\n' >> "$TMP"
done
printf "ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(window.PodFactoryLanding));\n" >> "$TMP"
"$ESBUILD" --loader=jsx --jsx-factory=React.createElement --jsx-fragment=React.Fragment \
  --minify --target=es2019 --log-level=warning < "$TMP" > app.js
rm "$TMP"
# Cache-busting: index.html apunta a app.js?v=<hash del contenido>. Sin esto el navegador
# sigue mostrando la versión vieja (Pages no permite controlar bien el caché de app.js).
HASH=$(shasum -a 256 app.js | cut -c1-10)
sed -i '' -E "s/app\.js\?v=[A-Za-z0-9]+/app.js?v=$HASH/" index.html
grep -q "app.js?v=$HASH" index.html || { echo "ERROR: no se actualizó la versión en index.html"; exit 1; }
echo "app.js: $(wc -c < app.js) bytes · versión $HASH"

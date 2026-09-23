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
echo "app.js: $(wc -c < app.js) bytes"

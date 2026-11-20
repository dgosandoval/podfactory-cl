// Tarifas que muestra la web: salen del hub (clientes.doppel.cl, pantalla «Tarifas», editable por Domingo e Iván) y se leen del JSON público
// https://clientes.doppel.cl/api/public/tarifas (CORS abierto para podfactory.cl). Si el hub no responde se usan los valores de RESPALDO de aquí (los de siempre).
// El cobro NO depende de lo que muestra el navegador: el servidor (functions/api/reserve.js) cobra el valor que lee del hub por su cuenta.
// Uso: window.PF_TARIFAS (siempre completo), window.usePfTarifas() (hook: se vuelve a pintar cuando llegan las del hub), window.pfClp(n).
const PF_IVA = 0.19;
const pfBruto = (n) => n + Math.round(n * PF_IVA);
const PF_TARIFAS_RESPALDO = {
  origen: 'respaldo',
  mini_piloto: { neto: 30000, bruto: pfBruto(30000) },
  cambio_sin_costo_horas: 36,
  locacion: { desde_neto: 950000, desde_bruto: pfBruto(950000), regiones_extra_neto: 250000 },
};
window.PF_TARIFAS = window.PF_TARIFAS || PF_TARIFAS_RESPALDO;
window.pfClp = (n) => '$' + Math.round(n).toLocaleString('es-CL');
const pfTarifasValidas = (j) => !!j && j.mini_piloto && Number.isInteger(j.mini_piloto.neto) && Number.isInteger(j.mini_piloto.bruto) && j.mini_piloto.neto > 0 && j.mini_piloto.bruto >= j.mini_piloto.neto
  && Number.isInteger(j.cambio_sin_costo_horas) && j.cambio_sin_costo_horas >= 1 && j.cambio_sin_costo_horas <= 168 && j.locacion && Number.isInteger(j.locacion.desde_neto) && j.locacion.desde_neto > 0;
window.pfTarifasCargar = window.pfTarifasCargar || (() => {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), 4000) : null;
  return fetch('https://clientes.doppel.cl/api/public/tarifas', ctl ? { signal: ctl.signal } : {})
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((j) => { if (!pfTarifasValidas(j)) throw new Error('forma inesperada'); window.PF_TARIFAS = { ...j, origen: 'hub' }; window.dispatchEvent(new Event('pf-tarifas')); })
    .catch((e) => { console.warn('tarifas: uso los valores de respaldo (' + (e && e.message) + ')'); })
    .finally(() => { if (t) clearTimeout(t); });
});
window.usePfTarifas = () => {
  const [t, setT] = React.useState(window.PF_TARIFAS);
  React.useEffect(() => { const h = () => setT(window.PF_TARIFAS); window.addEventListener('pf-tarifas', h); h(); return () => window.removeEventListener('pf-tarifas', h); }, []);
  return t;
};
window.pfTarifasCargar();

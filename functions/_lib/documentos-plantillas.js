// GENERADO a partir de las hojas HTML de «Tarifas y condiciones» e «Información del estudio» (21-nov-2026): el texto es el de los PDF publicados, palabra por palabra;
// lo único que cambia es que las CIFRAS (precios, horas de cambio, recargo, plazos) se insertan desde la tarifa vigente del hub en vez de estar escritas a mano.
// Se usan desde functions/_lib/documentos.js (que arma la página) y functions/condiciones.js / functions/informacion.js (que la sirven).
export const CSS_CONDICIONES = String.raw`
  @page { size: 210mm 297mm; margin: 0; }
  :root { --bg:#F5EBD6; --ink:#0A0A0A; --cream:#FCEFD4; --blue:#1F3FA3; --red:#D92E2E; --orange:#EF6A1F; --yellow:#F4B81C; --line:rgba(10,10,10,.16); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: var(--bg); color: var(--ink); font-family: 'Archivo', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; padding: 0 15mm; }
  .page:last-child { page-break-after: auto; }
  .serif { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; }
  .mono { font-family: 'Space Mono', monospace; letter-spacing: .14em; text-transform: uppercase; }
  .stripes { display: flex; flex-direction: column; gap: 1.2mm; }
  .stripes i { display: block; height: 1.8mm; }
  .stripes i:nth-child(1){background:var(--blue)} .stripes i:nth-child(2){background:var(--red)}
  .stripes i:nth-child(3){background:var(--orange)} .stripes i:nth-child(4){background:var(--yellow)}
  .foot { position: absolute; left: 15mm; right: 15mm; bottom: 9mm; display: flex; justify-content: space-between;
    font-family: 'Space Mono', monospace; font-size: 6.8pt; letter-spacing: .12em; text-transform: uppercase; opacity: .55; }
  .sec { font-size: 7.5pt; color: var(--red); font-weight: 700; margin: 0 0 2.5mm; }
  h2 { font-weight: 900; font-size: 22pt; line-height: 1; letter-spacing: -.015em; margin-bottom: 4mm; }
  h2 .serif { color: var(--red); font-size: 25pt; }
  p.lead { font-size: 9.5pt; line-height: 1.5; margin-bottom: 5mm; max-width: 165mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { text-align: left; font-family: 'Space Mono', monospace; font-size: 6.8pt; letter-spacing: .12em; text-transform: uppercase; font-weight: 700;
    padding: 2.2mm 2mm; border-bottom: .5mm solid var(--ink); }
  td { padding: 2.6mm 2mm; border-bottom: .25mm solid var(--line); vertical-align: top; line-height: 1.35; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  td b { font-weight: 800; }
  .price { font-weight: 900; font-size: 10.5pt; }
  small.g { display: block; font-size: 7.5pt; opacity: .65; margin-top: .6mm; }

  /* HEADER */
  .hero { margin: 0 -15mm; background: var(--ink); color: var(--cream); padding: 13mm 15mm 0; height: 112mm; position: relative; }
  .hero .logo { width: 44mm; }
  .hero .kick { position: absolute; top: 15mm; right: 15mm; font-size: 7pt; color: var(--yellow); text-align: right; line-height: 1.7; }
  .hero h1 { font-weight: 900; font-size: 34pt; line-height: .95; letter-spacing: -.02em; margin-top: 9mm; }
  .hero h1 .serif { color: var(--yellow); font-size: 38pt; }
  .hero .ph { position: absolute; left: 0; right: 0; bottom: 0; height: 45mm; background: url(/assets/doc/collage-condiciones.jpg) center / cover no-repeat; }
  .hero .stripes { position: absolute; right: 15mm; top: 40mm; width: 40mm; }

  .seasons { margin-top: 8mm; }
  .seasons td.n { font-size: 10pt; }
  .seasons td:first-child { white-space: nowrap; }
  .seasons tr.hi td { background: rgba(244,184,28,.28); }
  .tagmin { display: inline-block; background: var(--ink); color: var(--cream); font-family: 'Space Mono', monospace; font-size: 6.8pt; letter-spacing: .12em; padding: 1mm 2.2mm; margin-left: 2mm; vertical-align: 1mm; }
  .inc { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4mm; margin-top: 7mm; }
  .inc div { border-top: 1mm solid var(--blue); padding-top: 2.5mm; font-size: 8.5pt; line-height: 1.4; }
  .inc div:nth-child(2) { border-color: var(--red); } .inc div:nth-child(3) { border-color: var(--orange); }
  .inc b { display: block; font-size: 10pt; font-weight: 800; margin-bottom: 1mm; }

  .piloto { display: grid; grid-template-columns: 1fr auto; gap: 8mm; align-items: center; background: var(--ink); color: var(--cream);
    padding: 7mm 8mm; margin: 14mm 0 9mm; box-shadow: 1.8mm 1.8mm 0 var(--yellow); }
  .piloto .mono { font-size: 7pt; color: var(--yellow); font-weight: 700; }
  .piloto h3 { font-size: 17pt; font-weight: 900; margin: 1.5mm 0 2mm; }
  .piloto h3 .serif { color: var(--yellow); font-size: 19pt; }
  .piloto p { font-size: 9pt; line-height: 1.45; opacity: .9; }
  .piloto .v { text-align: right; font-weight: 900; font-size: 22pt; white-space: nowrap; }
  .piloto .v small { display: block; font-family: 'Space Mono', monospace; font-size: 7pt; font-weight: 400; opacity: .7; margin-top: 1mm; }

  .rule { background: var(--yellow); padding: 3.5mm 5mm; font-size: 9pt; line-height: 1.45; margin-top: 4mm; }
  .rule b { font-weight: 800; }

  .conds { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm 9mm; margin-top: 7mm; }
  .conds h4 { font-family: 'Space Mono', monospace; font-size: 7pt; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 1.8mm;
    padding-bottom: 1.5mm; border-bottom: .5mm solid var(--ink); }
  .conds ul { list-style: none; }
  .conds li { font-size: 9.6pt; line-height: 1.42; padding: 1mm 0 1mm 4.5mm; position: relative; }
  .conds li::before { content: "●"; position: absolute; left: 0; top: 1.6mm; font-size: 5pt; color: var(--red); }
  .conds li b { font-weight: 800; }
  .contact { position: absolute; left: 15mm; right: 15mm; bottom: 20mm; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm;
    border-top: .5mm solid var(--ink); padding-top: 5mm; font-size: 8.3pt; line-height: 1.55; }
  .contact h4 { font-family: 'Space Mono', monospace; font-size: 7pt; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 1.5mm; }
  .wa { display: inline-block; background: var(--ink); color: var(--cream); font-weight: 800; font-size: 11pt; padding: 3mm 5mm; margin-top: 2mm; box-shadow: 1.2mm 1.2mm 0 var(--red); }
`;
export const CSS_INFORMACION = String.raw`
  @page { size: 210mm 297mm; margin: 0; }
  :root { --bg:#F5EBD6; --ink:#0A0A0A; --cream:#FCEFD4; --blue:#1F3FA3; --red:#D92E2E; --orange:#EF6A1F; --yellow:#F4B81C; --line:rgba(10,10,10,.16); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: var(--bg); color: var(--ink); font-family: 'Archivo', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; padding: 0 15mm; }
  .page:last-child { page-break-after: auto; }
  .serif { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; }
  .mono { font-family: 'Space Mono', monospace; letter-spacing: .14em; text-transform: uppercase; }
  .stripes { display: flex; flex-direction: column; gap: 1.2mm; }
  .stripes i { display: block; height: 1.8mm; }
  .stripes i:nth-child(1){background:var(--blue)} .stripes i:nth-child(2){background:var(--red)}
  .stripes i:nth-child(3){background:var(--orange)} .stripes i:nth-child(4){background:var(--yellow)}
  .foot { position: absolute; left: 15mm; right: 15mm; bottom: 9mm; display: flex; justify-content: space-between;
    font-family: 'Space Mono', monospace; font-size: 6.8pt; letter-spacing: .12em; text-transform: uppercase; opacity: .55; }
  .sec { font-size: 7.5pt; color: var(--red); font-weight: 700; margin: 0 0 2.5mm; }
  h2 { font-weight: 900; font-size: 23pt; line-height: 1; letter-spacing: -.015em; margin-bottom: 3mm; }
  h2 .serif { color: var(--red); font-size: 26pt; }
  p.lead { font-size: 10.5pt; line-height: 1.5; margin-bottom: 5mm; }

  /* PÁG 1 */
  .cover { margin: 0 -15mm; background: var(--ink); color: var(--cream); padding: 13mm 15mm 0; position: relative; }
  .cover .logo { width: 46mm; display: block; }
  .cover .kick { position: absolute; top: 15mm; right: 15mm; font-size: 7pt; color: var(--yellow); text-align: right; line-height: 1.7; }
  .cover h1 { font-weight: 900; font-size: 40pt; line-height: .93; letter-spacing: -.025em; margin-top: 11mm; }
  .cover h1 .serif { color: var(--yellow); font-size: 45pt; }
  .cover .sub { font-size: 11pt; line-height: 1.5; margin-top: 5mm; max-width: 150mm; opacity: .9; padding-bottom: 8mm; }
  .faces { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.6mm; margin: 0 -15mm; background: var(--ink); }
  .faces div { height: 104mm; background-size: cover; background-position: center 30%; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 -15mm; border-bottom: .6mm solid var(--ink); }
  .stats div { padding: 6mm 5mm 5mm; border-right: .35mm solid var(--ink); position: relative; }
  .stats div:last-child { border-right: none; }
  .stats div::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1.8mm; }
  .stats div:nth-child(1)::before{background:var(--blue)} .stats div:nth-child(2)::before{background:var(--red)}
  .stats div:nth-child(3)::before{background:var(--orange)} .stats div:nth-child(4)::before{background:var(--yellow)}
  .stats b { display: block; font-size: 25pt; font-weight: 900; letter-spacing: -.03em; line-height: 1; }
  .stats span { display: block; font-family: 'Space Mono', monospace; font-size: 6.8pt; letter-spacing: .1em; text-transform: uppercase; margin-top: 1.5mm; opacity: .75; }
  .shows { margin-top: 7mm; font-size: 10pt; line-height: 1.55; }
  .shows .mono { font-size: 7pt; font-weight: 700; margin-bottom: 1.5mm; display: block; }
  .thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-top: 1mm; }
  .thumbs img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
  .shows i { font-family: 'Instrument Serif', serif; font-size: 13pt; }

  /* PÁG 2 */
  .gal { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 68mm 52mm; gap: 1.6mm; margin: 0 -15mm 8mm; }
  .gal div { background-size: cover; background-position: center; }
  .gal .g1 { background-position: center 55%; }
  .gal .g3 { grid-column: 1 / 3; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.6mm; }
  .gal .g3 div { background-size: cover; }
  .inc { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5mm; margin-top: 2mm; }
  .inc div { border-top: 1mm solid var(--blue); padding-top: 2.5mm; font-size: 9.2pt; line-height: 1.45; }
  .inc div:nth-child(2) { border-color: var(--red); } .inc div:nth-child(3) { border-color: var(--orange); }
  .inc b { display: block; font-size: 10.5pt; font-weight: 800; margin-bottom: 1mm; }
  .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 4mm; }
  .steps div { background: var(--cream); border: .35mm solid var(--ink); padding: 4mm; font-size: 9pt; line-height: 1.45; }
  .steps .n { font-family: 'Space Mono', monospace; font-weight: 700; font-size: 8pt; color: var(--red); }
  .steps b { display: block; font-size: 11pt; font-weight: 800; margin: 1mm 0; }

  /* PÁG 3 */
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { text-align: left; font-family: 'Space Mono', monospace; font-size: 6.8pt; letter-spacing: .12em; text-transform: uppercase; font-weight: 700;
    padding: 1.8mm 2mm; border-bottom: .5mm solid var(--ink); }
  td { padding: 1.15mm 2mm; border-bottom: .25mm solid var(--line); vertical-align: top; line-height: 1.35; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  .price { font-weight: 900; font-size: 11pt; }
  tr.hi td { background: rgba(244,184,28,.28); }
  tr.sub td { background: var(--ink); color: var(--cream); font-family: 'Space Mono', monospace; font-size: 6.8pt; letter-spacing: .1em; text-transform: uppercase; padding: 1.6mm 2mm; }
  small.g { display: block; font-size: 7.8pt; opacity: .65; margin-top: 1.5mm; }
  .tagmin { display: inline-block; background: var(--ink); color: var(--cream); font-family: 'Space Mono', monospace; font-size: 6.5pt; letter-spacing: .12em; padding: .8mm 2mm; margin-left: 2mm; vertical-align: .6mm; }
  .sets { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin: 0 0 2.5mm; font-size: 8.2pt; line-height: 1.4; }
  .sets .ph { height: 13mm; background-size: cover; background-position: center; margin-bottom: 2mm; border: .35mm solid var(--ink); }
  .sets b { display: block; font-size: 10.5pt; font-weight: 800; margin-bottom: .5mm; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; margin-top: 2.5mm; }
  .box { border: .35mm solid var(--ink); background: var(--cream); padding: 3mm 5mm; font-size: 9.2pt; line-height: 1.45; }
  .box h4 { font-family: 'Space Mono', monospace; font-size: 7pt; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 2mm; color: var(--red); }
  .box .big { font-size: 15pt; font-weight: 900; letter-spacing: -.02em; margin: 1mm 0; }
  .box ul { list-style: none; }
  .box li { display: flex; justify-content: space-between; gap: 3mm; padding: .35mm 0; border-bottom: .25mm solid var(--line); }
  .box li:last-child { border-bottom: none; }
  .box li b { white-space: nowrap; }
  .next { background: var(--ink); color: var(--cream); padding: 4mm 7mm; margin-top: 3.5mm; box-shadow: 1.8mm 1.8mm 0 var(--yellow);
    display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; }
  .next .mono { font-size: 7pt; color: var(--yellow); font-weight: 700; }
  .next h3 { font-size: 16pt; font-weight: 900; margin: 1.5mm 0 2mm; }
  .next h3 .serif { color: var(--yellow); font-size: 18pt; }
  .next p { font-size: 9.2pt; line-height: 1.45; opacity: .9; }
  .next .cta { display: inline-block; margin-top: 3mm; background: var(--red); color: #fff; font-weight: 800; font-size: 9.5pt; padding: 2.5mm 4mm; text-decoration: none; }
  .contact { position: absolute; left: 15mm; right: 15mm; bottom: 15.5mm; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; align-items: end;
    border-top: .5mm solid var(--ink); padding-top: 3.5mm; font-size: 9pt; line-height: 1.45; }
  .contact .fact { font-size: 8.3pt; line-height: 1.45; }
  .contact h4 { font-family: 'Space Mono', monospace; font-size: 7pt; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 1.5mm; }
  .contact a { color: inherit; }
  .contact a.wa { color: var(--cream); }
  .wa { display: inline-block; background: var(--ink); color: var(--cream); font-weight: 800; font-size: 11pt; padding: 3mm 5mm; box-shadow: 1.2mm 1.2mm 0 var(--red); text-decoration: none; }
`;
export const cuerpoCondiciones = (t, { m, filasCaps, rango, vig, vigDe, h36, plazoLargo, op, fact }) => `

<!-- ===== PÁGINA 1 · CAPÍTULOS Y PRECIOS ===== -->
<section class="page">
  <div class="hero">
    <img class="logo" src="/assets/doc/logo.png" alt="Pod Factory">
    <div class="kick mono">Estudio · Eduardo Marquina 3937, Vitacura<br>Tarifas vigentes desde ${vig}</div>
    <h1>Tarifas y<br><span class="serif">condiciones.</span></h1>
    <div class="stripes"><i></i><i></i><i></i><i></i></div>
    <div class="ph"></div>
  </div>

  <div class="seasons">
    <div class="sec mono">01 · Capítulos</div>
    <h2>Un capítulo <span class="serif">o los que quieras.</span></h2>
    <p class="lead">Compras de ${rango} capítulos y agendas cada grabación cuando te acomode, dentro del plazo. El mismo set y el mismo equipo en todos los capítulos. Mientras más capítulos, menor el valor por capítulo.</p>
    <table>
      <tr><th>Capítulos</th><th class="n">Base · cap.</th><th class="n">Base · total</th><th class="n">Full · cap.</th><th class="n">Full · total</th></tr>
      ${filasCaps(t)}
    </table>
    <small class="g" style="margin-top:2mm">Cualquier cantidad de ${rango}: mientras más capítulos, menor el valor por capítulo. El portal te muestra el valor exacto. Valores en pesos chilenos, más IVA. Set Base = mesa de madera, sillas, un micrófono por persona, fondo oscuro con luces RGB: eliges el color o las apagas y queda negro contrastado y 4 cámaras. Set Full = todo lo del Base + paneles de madera iluminados de fondo + televisor con tu logo o tus gráficas.</small>
  </div>

  <div class="inc">
    <div><b>Estudio y set</b>1 hora de estudio por capítulo, con la preparación incluida; el capítulo final dura de 20 a 40 minutos. Hasta 4 personas. Se pueden grabar 2 capítulos seguidos.</div>
    <div><b>Grabación</b>Set multicámara con cambio de cámaras en vivo, iluminación y un micrófono por participante. Operador técnico durante toda la grabación.</div>
    <div><b>Edición simple</b>Color, sonido, logo, música y nombres en pantalla, con 1 ronda de cambios. No incluye imágenes de apoyo, gráficas ni subtítulos.</div>
  </div>
  <div class="foot"><span>Pod Factory · Tarifas y condiciones</span><span>1 / 4</span></div>
</section>

<!-- ===== PÁGINA 2 · PILOTO, EDICIÓN Y OPCIONALES ===== -->
<section class="page">
  <div class="piloto">
    <div>
      <div class="mono">¿Quieres conocernos primero?</div>
      <h3>Visita gratis o <span class="serif">mini-piloto.</span></h3>
      <p><b>Visita al estudio</b>: 20 minutos para conocer el set y conversar tu idea, gratis. <b>Mini-piloto</b>: 10 minutos grabando en el set, gratis si llegas con la invitación de tu correo; si lo pagaste y después compras capítulos, se descuenta de la compra. Ambos se reservan en podfactory.cl.</p>
    </div>
    <div class="v">${m(t.mini_piloto.neto)}<small>+ IVA · mini-piloto · visita gratis</small></div>
  </div>

  <div class="sec mono">02 · Edición</div>
  <h2>Qué incluye <span class="serif">la edición.</span></h2>
  <table>
    <tr><th style="width:26%">Edición</th><th>Qué incluye</th><th class="n">Valor por cap.</th></tr>
    <tr><td><b>Simple</b></td><td>Color, sonido, logo, música y nombres en pantalla, con 1 ronda de cambios. Incluye hasta 3 cortes (ver «Cortes y rondas de cambio»).</td><td class="n price">Incluida</td></tr>
  </table>
  <div class="rule"><b>La regla:</b> si se pide cambiar el contenido o el orden del capítulo, o agregar imágenes de apoyo, ya no es edición simple. Te decimos qué opcional corresponde y su valor <b>antes</b> de editar, nunca después.</div>

  <div class="sec mono" style="margin-top:2mm">03 · Opcionales</div>
  <h2>Súmale <span class="serif">lo que necesites.</span></h2>
  <table>
    <tr><th style="width:26%">Opcional</th><th>Detalle</th><th class="n">Valor por cap.</th></tr>
    <tr><td><b>3 reels</b></td><td>Verticales, con subtítulos, listos para Instagram, TikTok y Shorts.</td><td class="n price">${m(op.reels)}</td></tr>
    <tr><td><b>Cámaras por separado</b></td><td>Archivo de cada cámara + pistas de audio.</td><td class="n price">${m(op.camaras)}</td></tr>
    <tr><td><b>Edición avanzada</b></td><td>Para capítulos que necesitan reordenarse, quitar varias partes o sumar menciones. Incluye hasta 10 cortes.</td><td class="n price">${m(op.cortes)}</td></tr>
    <tr><td><b>Imágenes de apoyo</b></td><td>Hasta 10 imágenes o gráficas entregadas por el cliente.</td><td class="n price">${m(op.imagenes)}</td></tr>
    <tr><td><b>Tráiler del capítulo</b></td><td>Un avance corto del capítulo, para redes.</td><td class="n price">${m(op.trailer)}</td></tr>
  </table>
  <small class="g" style="margin-top:1mm">Los opcionales se eligen al comprar y se pagan junto con los capítulos.</small>

  <table style="margin-top:2mm">
    <tr><th style="width:26%">Otros cobros</th><th>Cuándo</th><th class="n">Valor</th></tr>
    <tr><td><b>Tiempo extra</b></td><td>Cada ${t.tiempo_extra.minutos} minutos, solo si la grabación se pasa de la hora y el estudio está libre.</td><td class="n price">${m(t.tiempo_extra.neto)}</td></tr>
    <tr><td><b>Horario nocturno</b></td><td>Las grabaciones que empiezan a las ${t.recargo_nocturno.desde} o después tienen un recargo de ${m(t.recargo_nocturno.neto)} + IVA.</td><td class="n price">${m(t.recargo_nocturno.neto)}</td></tr>
    <tr><td><b>Ronda de cambios extra</b></td><td>Si pides una ronda adicional después de la entrega.</td><td class="n price">${m(t.ronda_cambios_extra.neto)}</td></tr>
  </table>
  <small class="g" style="margin-top:1.5mm">Valores en pesos chilenos, más IVA. Grabación en locación: desde ${m(t.locacion.desde_neto)} + IVA la jornada: hasta 3 horas de grabación y edición simple de hasta 3 piezas, con traslado, montaje y desmontaje en Santiago. Horas y piezas adicionales se suman; si tu proyecto es distinto, cotizamos a medida. V y VI Región: +${m(t.locacion.regiones_extra_neto)}. Webinars y matrimonios: ver sus tarifas aparte. Streaming en vivo: siempre a medida.</small>
  <div class="foot"><span>Pod Factory · Tarifas y condiciones</span><span>2 / 4</span></div>
</section>

<!-- ===== PÁGINA 3 · CORTES Y RONDAS DE CAMBIO ===== -->
<section class="page" style="padding-top:15mm">
  <div class="sec mono">04 · Cortes y cambios</div>
  <h2>Cortes y <span class="serif">rondas de cambio.</span></h2>
  <p class="lead">Así funciona lo que puedes pedir después de grabar, para que sepas qué está incluido y cuándo conviene la Edición avanzada.</p>
  <div class="conds" style="grid-template-columns:1fr">
    <div><h4>Qué es un corte</h4><ul>
      <li>Un corte es cualquier cambio que pides en el orden de la grabación: quitar un tramo (un error, una detención, una interrupción o un tema), o moverlo o insertarlo en otro lugar. Por ejemplo, una mención grabada al final que quieres al medio.</li>
      <li>La <b>edición simple incluye hasta 3 cortes</b>. La <b>Edición avanzada</b> (${m(op.cortes)} + IVA por capítulo) incluye <b>hasta 10</b>.</li>
      <li>Las detenciones que el operador marca en vivo durante la grabación no cuentan como corte.</li>
      <li>Puedes pedir cortes mientras grabas (avisando al operador) o dentro de tu ronda de cambios. Ambos suman al mismo tope.</li>
    </ul></div>
    <div><h4>Tu ronda de cambios</h4><ul>
      <li>La ronda de cambios es <b>una sola lista</b> con todo lo que quieres ajustar, enviada desde el formulario de la entrega en tu portal, dentro de <b>5 días hábiles</b> desde que recibes el capítulo.</li>
      <li>Si la lista llega por partes o después del plazo, cuenta como una ronda nueva (${m(t.ronda_cambios_extra.neto)} + IVA). Si pasa el plazo sin cambios, el capítulo se da por aprobado.</li>
      <li>Los ajustes de sonido, color, títulos o nombres son parte de la ronda y no cuentan como cortes.</li>
      <li>Si hay un error nuestro (un nombre mal escrito, un problema de audio o de imagen), lo corregimos sin costo y no gasta tu ronda.</li>
      <li>Cada lista que envías genera un correo de confirmación con el texto exacto, para todos los contactos de tu cuenta y para nuestro equipo.</li>
    </ul></div>
    <div><h4>Si necesitas más</h4><ul>
      <li>¿Tu capítulo necesita reordenarse, quitar varias partes o sumar menciones? Elige la Edición avanzada al comprar.</li>
      <li>¿Necesitas otra ronda después de la entrega? Se pide y se cobra aparte: ${m(t.ronda_cambios_extra.neto)} + IVA. Te avisamos el valor antes de editar, nunca después.</li>
    </ul></div>
  </div>
  <div class="foot"><span>Pod Factory · Tarifas y condiciones</span><span>3 / 4</span></div>
</section>

<!-- ===== PÁGINA 4 · CONDICIONES ===== -->
<section class="page" style="padding-top:15mm">
  <div class="sec mono">05 · Condiciones</div>
  <h2>Las reglas, <span class="serif">claras desde el inicio.</span></h2>
  <div class="conds">
    <div><h4>Pago</h4><ul>
      <li>Se compra y paga en línea (MercadoPago o transferencia), desde 1 capítulo y al mismo valor de dos formas (no hay descuento por pagar todo): <b>100% al comprar</b>, o <b>reservas sin pagar</b>: abonas el 50% hasta 24 horas antes de tu primera grabación y el otro 50% después de grabar, antes de la entrega.</li>
      <li>Si a las 24 horas antes de tu primera grabación no hay abono, se cancelan tus reservas y se libera el horario. Puedes volver a reservar pagando el abono.</li>
      <li>Mientras el saldo esté pendiente, tu entrega se ve en el portal, pero se reproduce y se descarga una vez pagado.</li>
      <li><b>Mini-piloto:</b> ${m(t.mini_piloto.neto)} + IVA al reservar; gratis con la invitación de tu correo.</li>
      <li>Los opcionales se eligen al comprar y se pagan con los capítulos.</li>
    </ul></div>
    <div><h4>Agenda y plazo</h4><ul>
      <li>Cada grabación se agenda cuando te acomode, según la disponibilidad del estudio, dentro del plazo de tu compra.</li>
      <li>Plazo para grabar: <b>${plazoLargo}</b>. Los capítulos no grabados dentro del plazo se pierden.</li>
    </ul></div>
    <div><h4>Cambios de fecha</h4><ul>
      <li>Hasta <b>${h36} horas antes</b>: se cambia la fecha o se cancela sin costo. 48 horas antes te pedimos confirmar.</li>
      <li>Con <b>menos de ${h36} horas</b>, o si no llegan: <b>se pierde la hora</b> y el capítulo se da por grabado. En el mini-piloto, se pierde el pago.</li>
      <li>Antes de cada grabación te pedimos confirmar asistencia por correo y WhatsApp.</li>
    </ul></div>
    <div><h4>El día de la grabación</h4><ul>
      <li>Cada grabación es de <b>1 hora de estudio</b>, con la preparación incluida: llegan a la hora reservada y salen una hora después. Si llegan tarde, igual termina a la hora.</li>
      <li>Si la grabación se pasa de la hora y el estudio está libre, el tiempo extra cuesta ${m(t.tiempo_extra.neto)} + IVA cada ${t.tiempo_extra.minutos} minutos. No se vende por adelantado.</li>
    </ul></div>
    <div><h4>Entrega y cambios</h4><ul>
      <li>Entrega a más tardar <b>5 días hábiles</b> después de la grabación, en MP4 (video) y MP3 (audio). Los archivos entregados quedan para descargar <b>90 días</b> en el portal.</li>
      <li>Tienes 5 días hábiles para pedir tu ronda de cambios. Pasado ese plazo, el capítulo se da por aprobado.</li>
    </ul></div>
    <div><h4>Material y respaldo</h4><ul>
      <li>El material en bruto se guarda <b>solo 1 semana</b> después de la entrega; luego se borra.</li>
      <li>Si quieres conservar el material completo, elige las cámaras por separado al comprar.</li>
    </ul></div>
    <div><h4>Uso del contenido</h4><ul>
      <li>El contenido es 100% tuyo. Pod Factory solo usa extractos en su portafolio si nos autorizas por escrito.</li>
    </ul></div>
    <div><h4>Facturación</h4><ul>
      <li>Factura electrónica con cada pago (o boleta si la pides). Te pedimos RUT, razón social y giro.</li>
      <li>Valores en pesos chilenos, más IVA. Vigentes desde ${vigDe}.</li>
    </ul></div>
  </div>

  <div class="contact">
    <div>
      <h4>Hablemos</h4>
      hola@podfactory.cl · podfactory.cl<br>Eduardo Marquina 3937, Vitacura
      <div><span class="wa">WhatsApp +56 9 2797 0014</span></div>
    </div>
    ${fact}
  </div>
  <div class="foot"><span>Pod Factory es parte de Doppel</span><span>4 / 4</span></div>
</section>

`;
export const cuerpoInformacion = (t, { m, filasCaps, rango, vig, plazoCorto, op, fact }) => `

<!-- ===== PÁGINA 1 · QUIÉNES SOMOS ===== -->
<section class="page">
  <div class="cover">
    <img class="logo" src="/assets/doc/logo.png" alt="Pod Factory">
    <div class="kick mono">Estudio y productora de podcast<br>Vitacura · Santiago · by Doppel</div>
    <h1>Tu podcast,<br><span class="serif">con look de cine.</span></h1>
    <p class="sub">Grabamos tu podcast en nuestro estudio de Vitacura o donde lo necesites. Tú llegas a conversar; del resto nos encargamos nosotros.</p>
  </div>
  <div class="faces">
    <div style="background-image:url('/assets/doc/reel_a.jpg')"></div>
    <div style="background-image:url('/assets/doc/reel_b.jpg')"></div>
    <div style="background-image:url('/assets/doc/reel_c.jpg')"></div>
    <div style="background-image:url('/assets/doc/reel_d.jpg')"></div>
  </div>
  <div class="stats">
    <div><b>+300</b><span>episodios producidos</span></div>
    <div><b>4</b><span>cámaras Blackmagic</span></div>
    <div><b>Rápida</b><span>entrega de cada capítulo</span></div>
    <div><b>Hasta 4</b><span>personas en el set</span></div>
  </div>
  <div class="shows">
    <span class="mono">Algunos podcasts grabados en el estudio</span>
    <div class="thumbs">
      <img src="/assets/doc/thumb-variables-ocultas.jpg" alt="" loading="lazy"><img src="/assets/doc/thumb-cafe-con-medicos.jpg" alt="" loading="lazy"><img src="/assets/doc/thumb-inteligencia-animal.jpg" alt="" loading="lazy"><img src="/assets/doc/thumb-soy-mas-que-mama.jpg" alt="" loading="lazy">
      <img src="/assets/doc/thumb-no-te-prospongas.jpg" alt="" loading="lazy"><img src="/assets/doc/thumb-pod-cats-dogs.jpg" alt="" loading="lazy"><img src="/assets/doc/thumb-dr-horse.jpg" alt="" loading="lazy"><img src="/assets/doc/thumb-talleres-luciernaga.jpg" alt="" loading="lazy">
    </div>
  </div>
  <div class="foot"><span>Pod Factory · Información del estudio</span><span>1 / 3</span></div>
</section>

<!-- ===== PÁGINA 2 · EL ESTUDIO Y CÓMO TRABAJAMOS ===== -->
<section class="page">
  <div class="gal">
    <div class="g1" style="background-image:url('/assets/doc/est_5.jpg')"></div>
    <div style="background-image:url('/assets/doc/est_3.jpg'); background-position: center 30%"></div>
    <div class="g3">
      <div style="background-image:url('/assets/doc/est_6.jpg'); background-position: center 60%"></div>
      <div style="background-image:url('/assets/doc/est_2.jpg')"></div>
      <div style="background-image:url('/assets/doc/est_1.jpg'); background-position: center 40%"></div>
      <div style="background-image:url('/assets/doc/est_4.jpg'); background-position: center 60%"></div>
    </div>
  </div>
  <div class="sec mono">01 · El estudio</div>
  <h2>Llegas y grabas: <span class="serif">todo está listo.</span></h2>
  <p class="lead">Un set en Vitacura con 4 cámaras (6K y 4K), luz de cine, un micrófono por persona, teleprompter y una sala de control donde el operador cambia de cámara en vivo. Hay dos looks: <b>Base</b> y <b>Full</b>, con paneles de madera y un televisor con tu logo.</p>
  <div class="inc">
    <div><b>Estudio y set</b>Un bloque de 1 hora de estudio por capítulo, con la preparación incluida (llegan a la hora reservada y salen una hora después); el capítulo final queda de 20 a 40 minutos, según el formato. Hasta 4 personas.</div>
    <div><b>Grabación</b>Multicámara con cambio de cámaras en vivo, iluminación, audio y un operador durante toda la grabación.</div>
    <div><b>Edición simple incluida</b>Color, sonido, logo, música y nombres en pantalla, con 1 ronda de cambios. No incluye imágenes de apoyo, gráficas ni subtítulos.</div>
  </div>
  <div class="sec mono" style="margin-top:9mm">02 · Cómo trabajamos</div>
  <div class="steps">
    <div><span class="n">01</span><b>Formato</b>Definimos contigo la idea, la estructura de cada capítulo y los invitados.</div>
    <div><span class="n">02</span><b>Agenda</b>Agendas cada grabación cuando te acomode, dentro del plazo de tu compra.</div>
    <div><span class="n">03</span><b>Grabación</b>Set, luz, audio y cámaras listos. Tú solo te preocupas de conversar.</div>
    <div><span class="n">04</span><b>Entrega</b>Cada capítulo editado en pocos días, en MP4 (video) y MP3 (audio), listo para YouTube, Spotify y redes.</div>
  </div>
  <div class="foot"><span>Pod Factory · Información del estudio</span><span>2 / 3</span></div>
</section>

<!-- ===== PÁGINA 3 · PRECIOS Y SIGUIENTE PASO ===== -->
<section class="page" style="padding-top:9mm">
  <div class="sec mono">03 · Precios</div>
  <h2>Un capítulo <span class="serif">o los que quieras.</span></h2>
  <div class="sets">
    <div><div class="ph" style="background-image:url('/assets/doc/collage-base.jpg')"></div><b>Set Base</b>Mesa de madera, sillas, un micrófono por persona, fondo oscuro con luces RGB: eliges el color o las apagas y queda negro contrastado y 4 cámaras.</div>
    <div><div class="ph" style="background-image:url('/assets/doc/collage-full.jpg')"></div><b>Set Full</b>Todo lo del Base, más paneles de madera iluminados de fondo y un televisor con tu logo o tus gráficas.</div>
  </div>
  <table>
    <tr><th>Capítulos</th><th class="n">Base · cap.</th><th class="n">Base · total</th><th class="n">Full · cap.</th><th class="n">Full · total</th></tr>
    ${filasCaps(t)}
  </table>
  <small class="g">Cualquier cantidad de ${rango}: mientras más capítulos, menor el valor por capítulo. El portal te muestra el valor exacto. Valores en pesos chilenos, más IVA. Pago en línea (MercadoPago o transferencia), al mismo valor: 100% al comprar, o reservas sin pagar, abonas el 50% hasta 24 horas antes de tu primera grabación (si no, se libera el horario) y el otro 50% antes de la entrega. Los opcionales se eligen al comprar y se pagan junto con los capítulos. Plazo para grabar: ${plazoCorto}. Las grabaciones que empiezan a las ${t.recargo_nocturno.desde} o después tienen un recargo de ${m(t.recargo_nocturno.neto)} + IVA.</small>
  <div style="border-left:1mm solid var(--red);padding:.4mm 0 .4mm 3mm;margin-top:2.5mm;font-size:8.4pt;line-height:1.4"><b>Cobros posteriores (solo si ocurren):</b> tiempo extra, ${m(t.tiempo_extra.neto)} cada ${t.tiempo_extra.minutos} minutos; ronda de cambios extra, ${m(t.ronda_cambios_extra.neto)}.</div>

  <div class="two">
    <div class="box">
      <h4>En locación</h4>
      Llevamos el set completo a tu oficina, un evento o donde lo necesites.
      <div class="big">desde ${m(t.locacion.desde_neto)} + IVA</div>
      Por jornada: hasta 3 horas de grabación y edición simple de hasta 3 piezas, con traslado, montaje y desmontaje en Santiago. Horas y piezas adicionales se suman; si tu proyecto es distinto, cotizamos a medida. V y VI Región: +${m(t.locacion.regiones_extra_neto)}.
    </div>
    <div class="box">
      <h4>Opcionales · por capítulo</h4>
      <ul>
        <li><span>3 reels</span><b>${m(op.reels)}</b></li>
        <li><span>Cámaras por separado (archivo de cada cámara + pistas de audio)</span><b>${m(op.camaras)}</b></li>
        <li><span>Edición avanzada (para capítulos que necesitan reordenarse, quitar varias partes o sumar menciones)</span><b>${m(op.cortes)}</b></li>
        <li><span>Imágenes de apoyo (hasta 10 imágenes o gráficas entregadas por el cliente)</span><b>${m(op.imagenes)}</b></li>
        <li><span>Tráiler del capítulo</span><b>${m(op.trailer)}</b></li>
      </ul>
    </div>
  </div>

  <div class="next" style="margin-top:2.5mm">
    <div>
      <div class="mono">El siguiente paso</div>
      <h3>Visita el estudio, <span class="serif">gratis.</span></h3>
      <p>20 minutos para ver el set, el look en el monitor y conversar tu idea. Sin compromiso.</p>
      <a class="cta" href="https://podfactory.cl/?agendar=1#reservar">AGENDAR EN PODFACTORY.CL →</a>
    </div>
    <div>
      <div class="mono">¿Quieres grabar antes de decidir?</div>
      <h3>Mini-piloto, <span class="serif">10 minutos.</span></h3>
      <p>Grabas 10 minutos en el set y ves tu podcast. ${m(t.mini_piloto.neto)} + IVA, gratis con la invitación de tu correo; si lo pagas y después compras capítulos, se descuenta de la compra.</p>
    </div>
  </div>

  <div class="contact">
    <div>
      hola@podfactory.cl · <a href="https://podfactory.cl">podfactory.cl</a><br>
      Eduardo Marquina 3937, Vitacura<br>
      <span style="font-size:7.8pt;opacity:.65">Condiciones completas: podfactory.cl/condiciones</span>
      <div style="margin-top:1.5mm"><a class="wa" href="https://wa.me/56927970014">WhatsApp +56 9 2797 0014</a></div>
    </div>
    ${fact}
  </div>
  <div class="foot"><span>Pod Factory es parte de Doppel · Valores vigentes desde ${vig}</span><span>3 / 3</span></div>
</section>
`;

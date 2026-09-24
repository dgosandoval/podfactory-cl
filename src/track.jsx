// Medición del funnel: GA4 + Meta Pixel.
// Los IDs viven en window.PF_TRACKING (index.html); si faltan, no se carga nada y
// pfTrack() solo deja el evento en dataLayer (útil para probar sin cuentas).
//
// Eventos (nombre GA4 → evento estándar de Meta):
//   whatsapp_click → Contact          · clic en cualquier link a wa.me
//   piloto_cta     → ViewContent      · clic en un botón que baja al calendario (visita / mini-piloto)
//   begin_checkout → InitiateCheckout · mini-piloto: "Pagar y reservar" (va a MercadoPago)
//   purchase       → Purchase         · vuelta de MercadoPago con ?reserva=ok (una vez por pago)
//   generate_lead  → Lead             · formulario de empresas enviado
//   schedule_visit → Schedule         · visita al estudio agendada
//   file_download  → (personalizado)  · descarga del PDF de condiciones
(function () {
  const cfg = window.PF_TRACKING || {};
  const META = {
    whatsapp_click: 'Contact', piloto_cta: 'ViewContent', begin_checkout: 'InitiateCheckout',
    purchase: 'Purchase', generate_lead: 'Lead', schedule_visit: 'Schedule',
  };

  window.pfTrack = function (name, params = {}) {
    try { (window.dataLayer = window.dataLayer || []).push({ event: name, ...params }); } catch (e) {}
    try { if (cfg.ga4 && window.gtag) window.gtag('event', name, params); } catch (e) {}
    try {
      if (cfg.metaPixel && window.fbq) {
        const std = META[name];
        const data = params.value != null ? { value: params.value, currency: params.currency || 'CLP' } : {};
        if (std) window.fbq('track', std, data, params.event_id ? { eventID: params.event_id } : undefined);
        else window.fbq('trackCustom', name, params);
      }
    } catch (e) {}
  };

  // Clics: un solo listener para WhatsApp, el CTA del piloto y el PDF.
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.includes('wa.me/')) {
      let ctx = '';
      try { ctx = decodeURIComponent((href.split('text=')[1] || '')).replace('Hola Pod Factory, ', '').slice(0, 80); } catch (e) {}
      window.pfTrack('whatsapp_click', { context: ctx, location: a.closest('section')?.id || 'header' });
    } else if (href === '#reservar') {
      window.pfTrack('piloto_cta', { location: a.closest('section')?.id || 'header' });
    } else if (href.endsWith('condiciones.pdf')) {
      window.pfTrack('file_download', { file_name: 'condiciones.pdf' });
    }
  }, true);
})();

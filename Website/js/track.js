// Seitenaufruf automatisch tracken
(async function () {
  try {
    await db.from('page_views').insert({
      page: location.pathname,
      referrer: document.referrer || null,
    });
  } catch (_) {}
})();

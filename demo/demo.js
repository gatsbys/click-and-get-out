const params = new URLSearchParams(location.search);
const modal = document.getElementById('newsletter-modal');
// ?modal=1 abre el aviso que bloquea el scroll, para probar «Recuperar desplazamiento».
const openModal = on => {
  modal.toggleAttribute('data-open', on);
  document.body.classList.toggle('locked', on);
};
if (params.get('modal') === '1') openModal(true);
// ?clean=1 esconde el ruido sin la extensión, para comparar de un vistazo.
if (params.get('clean') === '1') {
  for (const sel of ['#promo-bar', '#cookie-wall', '#video-float', '#sidebar-ad', '#app-banner', '#social-rail', '.ad-billboard', '.sponsored-grid', '.related-spam']) {
    document.querySelectorAll(sel).forEach(el => el.style.display = 'none');
  }
}
document.addEventListener('click', event => {
  const closer = event.target.closest('[data-close]');
  if (closer) document.querySelector(closer.dataset.close)?.remove();
  if (event.target.closest('[data-modal="off"]')) openModal(false);
});

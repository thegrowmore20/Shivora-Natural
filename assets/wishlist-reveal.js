/* -----------------------------------------------------------------------------
 * Wishlist reveal
 *
 * The gallery wishlist control (snippets/wishtlist-button.liquid) always renders
 * BOTH hearts — the outline "add" and the solid "remove" — and the third-party
 * wishlist app hides one of them once it knows whether the product is saved.
 * Until that runs (notably right after a page reload), both hearts show at once,
 * which looks like a distorted double heart.
 *
 * The button is kept hidden by CSS (.custom-wishlist-button, opacity/visibility)
 * and only revealed here once the app has resolved — i.e. once exactly one of the
 * two hearts is hidden — or after a short safety-net timeout so the control never
 * stays hidden if the app is absent or slow.
 * -------------------------------------------------------------------------- */
(function () {
  var READY_CLASS = 'is-wishlist-ready';
  var FALLBACK_MS = 2000;

  function reveal(button) {
    button.classList.add(READY_CLASS);
  }

  // The app hides one heart once it knows the saved state. Reading computed
  // display keeps this agnostic to HOW the app hides it (inline style, class,
  // or the [hidden] attribute all collapse display to none).
  function isResolved(add, remove) {
    return (
      getComputedStyle(add).display === 'none' ||
      getComputedStyle(remove).display === 'none'
    );
  }

  function bind(button) {
    if (button.dataset.wishlistRevealBound) return;
    button.dataset.wishlistRevealBound = '1';

    var add = button.querySelector('.xb-wishlist__add');
    var remove = button.querySelector('.xb-wishlist__remove');

    // Missing markup — nothing to wait for, just show whatever is there.
    if (!add || !remove) {
      reveal(button);
      return;
    }

    if (isResolved(add, remove)) {
      reveal(button);
      return;
    }

    var timer;
    var observer = new MutationObserver(function () {
      if (isResolved(add, remove)) {
        clearTimeout(timer);
        observer.disconnect();
        reveal(button);
      }
    });

    observer.observe(add, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    observer.observe(remove, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });

    // Safety net: never leave the control hidden, even if the app never runs.
    timer = setTimeout(function () {
      observer.disconnect();
      reveal(button);
    }, FALLBACK_MS);
  }

  function init() {
    var buttons = document.querySelectorAll('.custom-wishlist-button');
    for (var i = 0; i < buttons.length; i++) bind(buttons[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * Shop collection page controller: filter drawer, AJAX facet filtering,
 * dual-handle price slider, sort-by, active-filter pills, numbered
 * pagination.
 *
 * This is the same architecture as the ENSO build's facets.js, renamed to
 * match this section's ids (Shop* instead of Collection*), with the
 * load-more path removed entirely (this store only uses numbered
 * pagination) and the nav-menu-as-filter handling removed (not used here —
 * category navigation is handled by category-sidebar's own blocks).
 *
 * Every listener is delegated from `this.section` (or `document`), bound
 * once in the constructor. Nothing is re-bound after an AJAX swap: the
 * sidebar, toolbar and pagination wrapper all get their innerHTML replaced
 * on every filter/sort change, which would destroy a listener bound
 * directly to a child element. Delegating from a container that's never
 * itself replaced keeps everything working regardless of how many times
 * the content inside changes.
 */
class ShopFacets {
  constructor(root) {
    this.section = root;
    this.sectionId = root.dataset.sectionId;
    this.sidebar = document.getElementById(`ShopSidebar-${this.sectionId}`);
    this.overlay = root.querySelector('.shop-sidebar-overlay');

    this.pendingController = null;
    this.priceDebounce = null;

    this.bindEvents();
    this.initPriceSliders();
  }

  bindEvents() {
    this.section.addEventListener('click', (event) => this.handleClick(event));
    this.section.addEventListener('change', (event) => this.handleChange(event));
    this.section.addEventListener('input', (event) => this.handleInput(event));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.sidebar && this.sidebar.classList.contains('is-open')) {
        this.closeDrawer();
      }
    });
  }

  handleClick(event) {
    if (event.target.closest('.shop-toolbar__filter-toggle')) {
      this.openDrawer();
      return;
    }

    if (event.target.closest('[data-sidebar-close]')) {
      this.closeDrawer();
      return;
    }

    // Price pill "x" — a real button, only ever used for the price pill.
    const priceRemoveBtn = event.target.closest('.active-filters__remove');
    if (priceRemoveBtn) {
      const pill = priceRemoveBtn.closest('[data-price-pill]');
      if (pill) {
        this.clearPriceInputs(pill.dataset.minName, pill.dataset.maxName);
        this.submitFilters();
      }
      return;
    }

    // Any other active-filter pill, or "clear all" — both are plain links
    // whose href already encodes the correct removal/reset state server-side.
    const removableLink = event.target.closest('.active-filters__pill, .active-filters__clear-all');
    if (removableLink) {
      event.preventDefault();
      this.navigateViaAjax(removableLink.getAttribute('href'));
    }
  }

  handleChange(event) {
    if (event.target.matches('.sort-by__select')) {
      // Two sort selects exist (toolbar + drawer variant). Keep them in sync
      // immediately so whichever one is visible always shows the current value.
      const value = event.target.value;
      this.section.querySelectorAll('.sort-by__select').forEach((select) => {
        select.value = value;
      });
      this.submitFilters();
      return;
    }

    if (event.target.matches('.facets__checkbox')) {
      this.submitFilters();
    }
  }

  handleInput(event) {
    if (event.target.matches('.price-range__input, .price-range__range')) {
      this.syncPriceRange(event.target);
      clearTimeout(this.priceDebounce);
      this.priceDebounce = setTimeout(() => this.submitFilters(), 500);
    }
  }

  openDrawer() {
    if (!this.sidebar) return;
    this.sidebar.classList.add('is-open');
    this.sidebar.setAttribute('aria-hidden', 'false');
    if (this.overlay) this.overlay.classList.add('is-open');
    const toggle = this.section.querySelector('.shop-toolbar__filter-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('shop-drawer-open');
  }

  closeDrawer() {
    if (!this.sidebar) return;
    this.sidebar.classList.remove('is-open');
    this.sidebar.setAttribute('aria-hidden', 'true');
    if (this.overlay) this.overlay.classList.remove('is-open');
    const toggle = this.section.querySelector('.shop-toolbar__filter-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
    document.body.classList.remove('shop-drawer-open');
  }

  // ---- Price range: dual-handle slider <-> number inputs -----------------

  syncPriceRange(target) {
    const container = target.closest('.price-range');
    if (!container) return;

    const minNumber = container.querySelector('.price-range__input--min');
    const maxNumber = container.querySelector('.price-range__input--max');
    const minRange = container.querySelector('.price-range__range--min');
    const maxRange = container.querySelector('.price-range__range--max');
    if (!minNumber || !maxNumber || !minRange || !maxRange) return;

    const rangeMax = Number(minRange.max) || 0;

    if (target === minRange) {
      let val = Number(minRange.value);
      const maxVal = Number(maxRange.value);
      if (val > maxVal) {
        val = maxVal;
        minRange.value = String(val);
      }
      minNumber.value = String(val);
    } else if (target === maxRange) {
      let val = Number(maxRange.value);
      const minVal = Number(minRange.value);
      if (val < minVal) {
        val = minVal;
        maxRange.value = String(val);
      }
      maxNumber.value = String(val);
    } else if (target === minNumber) {
      let val = minNumber.value === '' ? 0 : Number(minNumber.value);
      const maxVal = maxNumber.value === '' ? rangeMax : Number(maxNumber.value);
      if (Number.isNaN(val)) val = 0;
      if (val > maxVal) val = maxVal;
      if (val < 0) val = 0;
      minRange.value = String(val);
    } else if (target === maxNumber) {
      let val = maxNumber.value === '' ? rangeMax : Number(maxNumber.value);
      const minVal = minNumber.value === '' ? 0 : Number(minNumber.value);
      if (Number.isNaN(val)) val = rangeMax;
      if (val < minVal) val = minVal;
      if (val > rangeMax) val = rangeMax;
      maxRange.value = String(val);
    } else {
      return;
    }

    this.updatePriceTrackFill(container, minRange, maxRange, rangeMax);
  }

  updatePriceTrackFill(container, minRange, maxRange, rangeMax) {
    const track = container.querySelector('.price-range__track-fill');
    if (!track || !rangeMax) return;
    const minPercent = (Number(minRange.value) / rangeMax) * 100;
    const maxPercent = (Number(maxRange.value) / rangeMax) * 100;
    track.style.left = `${minPercent}%`;
    track.style.right = `${100 - maxPercent}%`;
  }

  initPriceSliders() {
    if (!this.sidebar) return;
    this.sidebar.querySelectorAll('.price-range').forEach((container) => {
      const minRange = container.querySelector('.price-range__range--min');
      const maxRange = container.querySelector('.price-range__range--max');
      if (!minRange || !maxRange) return;
      const rangeMax = Number(minRange.max) || 0;
      this.updatePriceTrackFill(container, minRange, maxRange, rangeMax);
    });
  }

  clearPriceInputs(minName, maxName) {
    if (!this.sidebar) return;

    const minInput = minName ? this.sidebar.querySelector(`[name="${minName}"]`) : null;
    const maxInput = maxName ? this.sidebar.querySelector(`[name="${maxName}"]`) : null;
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';

    const anchor = minInput || maxInput;
    const container = anchor ? anchor.closest('.price-range') : null;
    if (!container) return;

    const minRange = container.querySelector('.price-range__range--min');
    const maxRange = container.querySelector('.price-range__range--max');
    if (minRange) minRange.value = minRange.min || '0';
    if (maxRange) maxRange.value = maxRange.max || '0';
    if (minRange && maxRange) {
      this.updatePriceTrackFill(container, minRange, maxRange, Number(minRange.max) || 0);
    }
  }

  // ---- Filtering / fetching -----------------------------------------------

  buildQueryString() {
    const params = new URLSearchParams();

    if (this.sidebar) {
      this.sidebar.querySelectorAll('.facets__checkbox:checked').forEach((el) => {
        if (el.name) params.append(el.name, el.value);
      });
      this.sidebar.querySelectorAll('.price-range__input').forEach((el) => {
        if (el.name && el.value !== '') params.append(el.name, el.value);
      });
    }

    const sortSelect = this.section.querySelector('.sort-by__select');
    if (sortSelect && sortSelect.value) params.set('sort_by', sortSelect.value);

    return params.toString();
  }

  submitFilters() {
    const query = this.buildQueryString();
    const fetchUrl = `${window.location.pathname}?section_id=${this.sectionId}&${query}`;

    this.fetchAndReplace(fetchUrl, () => {
      const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.pushState({ shopFilter: true }, '', newUrl);
    });
  }

  navigateViaAjax(href) {
    if (!href) return;
    const fetchUrl = `${href}${href.includes('?') ? '&' : '?'}section_id=${this.sectionId}`;
    this.fetchAndReplace(fetchUrl, () => {
      window.history.pushState({ shopFilter: true }, '', href);
    });
  }

  fetchAndReplace(url, onSuccess) {
    if (this.pendingController) this.pendingController.abort();
    const controller = new AbortController();
    this.pendingController = controller;

    this.section.classList.add('is-loading');

    fetch(url, { signal: controller.signal })
      .then((response) => response.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        this.swapSidebar(doc);
        this.swapSimple(doc, `#ShopProductGridContainer-${this.sectionId}`);
        this.swapSimple(doc, `#ShopPaginationWrapper-${this.sectionId}`);
        this.swapSimple(doc, `#ShopToolbar-${this.sectionId}`);
        this.initPriceSliders();
        if (onSuccess) onSuccess();
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.error(error);
      })
      .finally(() => {
        this.section.classList.remove('is-loading');
        if (this.pendingController === controller) this.pendingController = null;
      });
  }

  /**
   * Generic innerHTML swap for wrapper elements that ALWAYS render (even
   * empty) — ShopProductGridContainer, ShopPaginationWrapper, ShopToolbar.
   * These must never be conditionally omitted in Liquid: if the fetched
   * HTML doesn't contain the element, this falls back to clearing the
   * current one instead of silently leaving stale content (and stale click
   * targets — e.g. pagination links whose page= predates the current
   * filters) behind.
   */
  swapSimple(doc, selector) {
    const current = document.querySelector(selector);
    if (!current) return;
    const incoming = doc.querySelector(selector);
    current.innerHTML = incoming ? incoming.innerHTML : '';
  }

  /**
   * Sidebar swap preserves each accordion's open/closed state across the
   * innerHTML replacement, keyed by the stable data-filter-param attribute
   * on each <details> in shop-filters.liquid. Without this, every AJAX
   * update re-derives "open" purely from whether the filter has active
   * values server-side — so unchecking the last value in a group would
   * flip it back to the server's default (closed) even though the user
   * never touched the <summary> header.
   */
  swapSidebar(doc) {
    if (!this.sidebar) return;
    const incoming = doc.querySelector(`#ShopSidebar-${this.sectionId}`);
    if (!incoming) return;

    const openState = {};
    this.sidebar.querySelectorAll('.facets__group[data-filter-param]').forEach((el) => {
      openState[el.dataset.filterParam] = el.open;
    });

    this.sidebar.innerHTML = incoming.innerHTML;

    this.sidebar.querySelectorAll('.facets__group[data-filter-param]').forEach((el) => {
      const key = el.dataset.filterParam;
      if (Object.prototype.hasOwnProperty.call(openState, key)) {
        el.open = openState[key];
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.shop-section[data-section-id]').forEach((root) => {
    new ShopFacets(root);
  });
});
/*
  Scroll progress bar — a thin fixed strip whose width tracks how far down
  the page the visitor has scrolled (0% at the top, 100% at the bottom).
*/
(() => {
  const bar = document.querySelector('[data-scroll-progress]');
  if (!bar) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    bar.style.width = Math.min(100, Math.max(0, progress)) + '%';
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();

// class MobileNav {
//   #toggle
//   #nav
//   #overlay

//   constructor() {
//     this.#toggle = document.querySelector('.header__menu-toggle')
//     this.#nav = document.querySelector('.header__nav')
//     this.#overlay = document.querySelector('.header__nav-overlay')
//     if (!this.#toggle || !this.#nav) return

//     this.#toggle.addEventListener('click', () => this.#open())
//     for (const dismiss of document.querySelectorAll('[data-nav-dismiss]')) {
//       dismiss.addEventListener('click', () => this.#close())
//     }
//   }

//   #open() {
//     this.#nav.classList.add('is-open')
//     this.#overlay?.classList.add('is-open')
//   }

//   #close() {
//     this.#nav.classList.remove('is-open')
//     this.#overlay?.classList.remove('is-open')
//   }
// }

class HeaderMegaMenu {
  #items
  #desktopQuery = window.matchMedia('(min-width: 990px)')

  constructor(nav) {
    this.#items = [...nav.querySelectorAll('[data-nav-dropdown]')]
    if (!this.#items.length) return

    // Desktop opens on hover (pure CSS, see base.css); this click-toggle is
    // only meant for the mobile/tablet drawer, where there's no hover.
    for (const item of this.#items) {
      const toggle = item.querySelector('[data-nav-dropdown-toggle]')
      toggle?.addEventListener('click', (event) => {
        if (this.#desktopQuery.matches) return
        event.stopPropagation()
        this.#toggle(item)
      })
    }

    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-nav-dropdown]')) this.#closeAll()
    })
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.#closeAll()
    })
  }

  #toggle(item) {
    const isOpen = item.classList.contains('is-open')
    this.#closeAll()
    if (!isOpen) {
      item.classList.add('is-open')
      item.querySelector('[data-nav-dropdown-toggle]')?.setAttribute('aria-expanded', 'true')
    }
  }

  #closeAll() {
    for (const item of this.#items) {
      item.classList.remove('is-open')
      item.querySelector('[data-nav-dropdown-toggle]')?.setAttribute('aria-expanded', 'false')
    }
  }
}

class HeroSlider {
  #slides
  #dots
  #index = 0
  #intervalMs = 0
  #timer

  constructor(root) {
    this.#slides = [...root.querySelectorAll('[data-hero-slide]')]
    if (this.#slides.length < 2) return

    this.#dots = [...root.querySelectorAll('[data-hero-dot]')]
    for (const dot of this.#dots) {
      dot.addEventListener('click', () => this.#show(Number(dot.dataset.index)))
    }
    root.querySelector('[data-hero-prev]')?.addEventListener('click', () => this.#step(-1))
    root.querySelector('[data-hero-next]')?.addEventListener('click', () => this.#step(1))

    if (root.dataset.autoplay === 'true') {
      const seconds = Number(root.dataset.autoplaySpeed) || 5
      this.#intervalMs = seconds * 1000
      root.addEventListener('mouseenter', () => this.#stop())
      root.addEventListener('mouseleave', () => this.#start())
      this.#start()
    }
  }

  #start() {
    if (!this.#intervalMs) return
    this.#stop()
    this.#timer = setInterval(() => this.#step(1), this.#intervalMs)
  }

  #stop() {
    clearInterval(this.#timer)
  }

  #step(direction) {
    this.#show((this.#index + direction + this.#slides.length) % this.#slides.length)
  }

  #show(index) {
    this.#index = index
    for (const [i, slide] of this.#slides.entries()) slide.classList.toggle('is-active', i === index)
    for (const [i, dot] of this.#dots.entries()) dot.classList.toggle('is-active', i === index)
  }
}

class LoadMoreGrid {
  constructor(root) {
    const button = root.querySelector('[data-load-more]')
    const hiddenItems = root.querySelectorAll('.product-grid__item--more')
    if (!button || !hiddenItems.length) return

    button.addEventListener(
      'click',
      () => {
        for (const item of hiddenItems) item.classList.remove('product-grid__item--more')
        button.remove()
      },
      { once: true }
    )
  }
}

class CardSlider {
  #track

  constructor(root) {
    this.#track = root
    root.parentElement?.querySelector('[data-slider-prev]')?.addEventListener('click', () => this.#scroll(-1))
    root.parentElement?.querySelector('[data-slider-next]')?.addEventListener('click', () => this.#scroll(1))
  }

  #scroll(direction) {
    const card = this.#track.querySelector(':scope > *')
    const amount = card ? card.getBoundingClientRect().width + 16 : this.#track.clientWidth
    this.#track.scrollBy({ left: amount * direction, behavior: 'smooth' })
  }
}

class VariantPicker {
  #root
  #variants
  #idInput
  #addToCartButton
  #addToCartLabel
  #priceCurrent
  #priceCompare
  #badge

  constructor(root) {
    this.#root = root
    const dataScript = root.parentElement?.querySelector('[data-variant-data]')
    if (!dataScript) return

    try {
      this.#variants = JSON.parse(dataScript.textContent)
    } catch {
      return
    }

    const form = root.closest('form')
    this.#idInput = form?.querySelector('[data-product-variant-id]')
    this.#addToCartButton = form?.querySelector('[data-product-add-to-cart]')
    this.#addToCartLabel = form?.querySelector('[data-product-add-to-cart-label]')
    this.#priceCurrent = form?.querySelector('[data-product-price-current]')
    this.#priceCompare = form?.querySelector('[data-product-price-compare]')
    this.#badge = form?.querySelector('[data-product-badge]')

    root.addEventListener('change', (event) => {
      if (!event.target.classList.contains('product__option-radio')) return
      this.#onSelect()
    })
  }

  #onSelect() {
    const groups = [...this.#root.querySelectorAll('.product__option')]
    const selected = groups.map((group) => group.querySelector('.product__option-radio:checked')?.value)

    for (const group of groups) {
      const label = group.querySelector('[data-option-selected]')
      const checkedValue = group.querySelector('.product__option-radio:checked')?.value
      if (label && checkedValue) label.textContent = checkedValue
    }

    const variant = this.#variants.find((v) => v.options.every((value, i) => value === selected[i]))
    if (!variant) return

    if (this.#idInput) this.#idInput.value = variant.id

    if (this.#priceCurrent) this.#priceCurrent.textContent = variant.price
    if (this.#priceCompare) {
      const hasCompare = variant.compare_at_price_raw > variant.price_raw
      this.#priceCompare.hidden = !hasCompare
      if (hasCompare) this.#priceCompare.textContent = variant.compare_at_price
    }
    if (this.#badge) {
      const hasCompare = variant.compare_at_price_raw > variant.price_raw
      this.#badge.hidden = !hasCompare
      if (hasCompare) {
        const pct = Math.round(((variant.compare_at_price_raw - variant.price_raw) / variant.compare_at_price_raw) * 100)
        this.#badge.textContent = `-${pct}%`
      }
    }

    if (this.#addToCartButton) this.#addToCartButton.disabled = !variant.available
    if (this.#addToCartLabel) this.#addToCartLabel.textContent = variant.available ? 'Add to Cart' : 'Sold Out'

    if (variant.featured_media_id) {
      const thumb = document.querySelector(`[data-gallery-thumb][data-media-id="${variant.featured_media_id}"]`)
      thumb?.click()
    }
  }
}

class HeaderScroll {
  #header
  #lastY = window.scrollY
  #ticking = false

  constructor(header) {
    this.#header = header
    window.addEventListener('scroll', () => this.#queueUpdate(), { passive: true })
  }

  #queueUpdate() {
    if (this.#ticking) return
    this.#ticking = true
    requestAnimationFrame(() => this.#update())
  }

  #update() {
    const currentY = window.scrollY
    const scrollingDown = currentY > this.#lastY

    if (scrollingDown && currentY > this.#header.offsetHeight) {
      this.#header.classList.add('header--hidden')
    } else {
      this.#header.classList.remove('header--hidden')
    }

    this.#lastY = currentY
    this.#ticking = false
  }
}

class ReelVideos {
  #observer

  constructor() {
    const cards = document.querySelectorAll('[data-reel]')
    if (!cards.length || !('IntersectionObserver' in window)) return

    this.#observer = new IntersectionObserver((entries) => this.#onIntersect(entries), {
      rootMargin: '200px 0px',
      threshold: 0.4,
    })
    for (const card of cards) this.#observer.observe(card)
  }

  #onIntersect(entries) {
    for (const entry of entries) {
      const card = entry.target
      const video = this.#hydrate(card)
      if (!video) continue
      if (entry.isIntersecting) {
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    }
  }

  #hydrate(card) {
    const existing = card.querySelector('video')
    if (existing) return existing

    const template = card.querySelector('template[data-reel-source]')
    if (!template) return null

    card.append(template.content.cloneNode(true))
    const poster = card.querySelector('.reel-card__poster')
    if (poster) poster.hidden = true

    const video = card.querySelector('video')
    if (video) video.load()

    return video
  }
}

class ProductGallery {
  #slides
  #thumbs
  #expand
  #index = 0

  constructor(root) {
    this.#slides = [...root.querySelectorAll('[data-gallery-slide]')]
    this.#thumbs = [...root.querySelectorAll('[data-gallery-thumb]')]
    this.#expand = root.querySelector('[data-gallery-expand]')
    if (!this.#slides.length) return

    for (const thumb of this.#thumbs) {
      thumb.addEventListener('click', () => this.#show(Number(thumb.dataset.index)))
    }
    root.querySelector('[data-gallery-prev]')?.addEventListener('click', () => this.#step(-1))
    root.querySelector('[data-gallery-next]')?.addEventListener('click', () => this.#step(1))

    this.#show(0)
  }

  #step(direction) {
    const next = (this.#index + direction + this.#slides.length) % this.#slides.length
    this.#show(next)
  }

  #show(index) {
    this.#index = index
    for (const [i, slide] of this.#slides.entries()) slide.classList.toggle('is-active', i === index)
    for (const [i, thumb] of this.#thumbs.entries()) thumb.classList.toggle('is-active', i === index)

    if (this.#expand) {
      const image = this.#slides[index]?.querySelector('img')
      if (image?.currentSrc) this.#expand.href = image.currentSrc
    }
  }
}

class QuantitySelector {
  constructor(root) {
    const input = root.querySelector('input[type="number"]')
    if (!input) return

    root.querySelector('[data-quantity-minus]')?.addEventListener('click', () => {
      input.value = Math.max(Number(input.min) || 1, Number(input.value) - 1)
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    root.querySelector('[data-quantity-plus]')?.addEventListener('click', () => {
      input.value = Number(input.value) + 1
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
}

class ShareButton {
  constructor(button) {
    button.addEventListener('click', () => this.#onClick(button))
  }

  async #onClick(button) {
    const shareData = { title: button.dataset.shareTitle || document.title, url: location.href }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // user cancelled the native share sheet — nothing to do
      }
      return
    }

    try {
      await navigator.clipboard.writeText(shareData.url)
      this.#flashLabel(button, 'Link Copied!')
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  #flashLabel(button, message) {
    const label = button.textContent
    button.textContent = message
    setTimeout(() => {
      button.textContent = label
    }, 1800)
  }
}

class ProductRecommendations {
  constructor(root) {
    const target = root.querySelector('[data-product-recommendations-target]')
    const url = root.dataset.url
    if (!target || !url) return

    if (!('IntersectionObserver' in window)) {
      this.#load(url, target)
      return
    }

    const observer = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        obs.disconnect()
        this.#load(url, target)
      }
    }, { rootMargin: '300px 0px' })
    observer.observe(root)
  }

  async #load(url, target) {
    try {
      const response = await fetch(url)
      if (!response.ok) return
      const html = await response.text()
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const fresh = doc.querySelector('[data-product-recommendations-target]')
      if (fresh) target.innerHTML = fresh.innerHTML
      for (const slider of target.querySelectorAll('[data-slider]')) new CardSlider(slider)
      new LoadMoreGrid(target)
    } catch {
      // network error — leave the section empty rather than break the page
    }
  }
}

class YouTubeFacade {
  constructor(button) {
    button.addEventListener('click', () => this.#embed(button), { once: true })
  }

  #embed(button) {
    const videoId = button.dataset.videoId
    if (!videoId) return

    const iframe = document.createElement('iframe')
    iframe.className = 'reel-card__media'
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`
    iframe.title = 'YouTube video'
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture'
    iframe.allowFullscreen = true
    iframe.setAttribute('frameborder', '0')

    button.replaceWith(iframe)
  }
}

class DiscountPopup {
  #storageKey = 'shivora:discount-popup-seen'

  constructor(root) {
    let alreadySeen = true
    try {
      alreadySeen = localStorage.getItem(this.#storageKey) === 'true'
    } catch {
      // storage unavailable (private mode, etc.) — don't show the popup rather than risk showing it every load
      return
    }
    if (alreadySeen) return

    root.hidden = false

    for (const dismiss of root.querySelectorAll('[data-discount-popup-dismiss]')) {
      dismiss.addEventListener('click', () => this.#dismiss(root))
    }
    root.querySelector('form')?.addEventListener('submit', () => this.#remember())
  }

  #dismiss(root) {
    this.#remember()
    root.hidden = true
  }

  #remember() {
    try {
      localStorage.setItem(this.#storageKey, 'true')
    } catch {
      // ignore — worst case the popup shows again next load
    }
  }
}

class ReviewForm {
  constructor(root) {
    const toggle = root.querySelector('[data-review-form-toggle]')
    const form = root.querySelector('[data-review-form]')
    if (!toggle || !form) return

    toggle.addEventListener('click', () => {
      const isOpen = !form.hidden
      form.hidden = isOpen
      toggle.setAttribute('aria-expanded', String(!isOpen))
    })
  }
}

class PredictiveSearch {
  #root
  #overlay
  #input
  #results
  #baseUrl
  #controller
  #debounceId

  constructor(root) {
    this.#root = root
    this.#overlay = document.querySelector('.predictive-search__overlay')
    this.#input = root.querySelector('[data-predictive-search-input]')
    this.#results = root.querySelector('[data-predictive-search-results]')
    this.#baseUrl = root.dataset.url
    if (!this.#input || !this.#results || !this.#baseUrl) return

    for (const trigger of document.querySelectorAll('[data-search-toggle]')) {
      trigger.addEventListener('click', () => this.#open())
    }
    for (const dismiss of document.querySelectorAll('[data-predictive-search-dismiss]')) {
      dismiss.addEventListener('click', () => this.#close())
    }
    this.#input.addEventListener('input', () => this.#onInput())
  }

  #open() {
    this.#root.classList.add('is-open')
    this.#overlay?.classList.add('is-open')
    this.#input.focus()
  }

  #close() {
    this.#root.classList.remove('is-open')
    this.#overlay?.classList.remove('is-open')
  }

  #onInput() {
    clearTimeout(this.#debounceId)
    const term = this.#input.value.trim()
    if (term.length < 2) {
      this.#results.innerHTML = ''
      return
    }
    this.#debounceId = setTimeout(() => this.#search(term), 250)
  }

  async #search(term) {
    this.#controller?.abort()
    this.#controller = new AbortController()

    try {
      const response = await fetch(`${this.#baseUrl}&q=${encodeURIComponent(term)}`, {
        signal: this.#controller.signal,
      })
      if (!response.ok) return
      const html = await response.text()
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const fresh = doc.querySelector('[data-predictive-search-results]')
      if (fresh) this.#results.innerHTML = fresh.innerHTML
    } catch {
      // aborted (a newer keystroke superseded this request) or network error — ignore
    }
  }
}

class CartDrawer {
  #root
  #overlay
  #target
  #drawerCount
  #sectionId

  constructor(root) {
    this.#root = root
    this.#sectionId = root.dataset.sectionId || 'cart-drawer'
    this.#overlay = document.querySelector('.cart-drawer-overlay')
    this.#target = root.querySelector('[data-cart-drawer-target]')
    this.#drawerCount = root.querySelector('[data-cart-drawer-count]')

    for (const trigger of document.querySelectorAll('[data-cart-toggle]')) {
      trigger.addEventListener('click', () => this.#open())
    }
    for (const dismiss of document.querySelectorAll('[data-cart-drawer-dismiss]')) {
      dismiss.addEventListener('click', () => this.#close())
    }
    document.addEventListener('submit', (event) => this.#onAddToCartSubmit(event), true)

    if (!this.#target) return
    this.#target.addEventListener('click', (event) => this.#onTargetClick(event))
    this.#target.addEventListener('change', (event) => this.#onTargetChange(event))
  }

  #open() {
    this.#root.classList.add('is-open')
    this.#overlay?.classList.add('is-open')
  }

  #close() {
    this.#root.classList.remove('is-open')
    this.#overlay?.classList.remove('is-open')
  }

  #onTargetClick(event) {
    if (event.target.closest('[data-cart-drawer-dismiss]')) {
      this.#close()
      return
    }
    const minus = event.target.closest('[data-quantity-minus]')
    const plus = event.target.closest('[data-quantity-plus]')
    const remove = event.target.closest('[data-cart-remove]')

    if (minus || plus) {
      const wrapper = event.target.closest('[data-cart-quantity]')
      const input = wrapper?.querySelector('.quantity-selector__input')
      if (!input) return
      input.value = Math.max(0, Number(input.value) + (plus ? 1 : -1))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      return
    }

    if (remove) {
      event.preventDefault()
      this.#updateLine(remove.dataset.key, 0)
    }
  }

  #onTargetChange(event) {
    const wrapper = event.target.closest('[data-cart-quantity]')
    if (!wrapper) return
    this.#updateLine(wrapper.dataset.key, Number(event.target.value))
  }

  async #updateLine(key, quantity) {
    if (!key) return
    this.#target?.classList.add('is-loading')

    try {
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity }),
      })
      await this.#refresh()
    } catch {
      // network error — drawer keeps its last known state
    } finally {
      this.#target?.classList.remove('is-loading')
    }
  }

  // #onAddToCartSubmit(event) {
  //   const form = event.target
  //   if (!(form instanceof HTMLFormElement) || !form.action.includes('/cart/add')) return

  //   event.preventDefault()
  //   this.#addToCart(form)
  // }

  #onAddToCartSubmit(event) {
    const form = event.target.closest?.('form')
    if (!form || event.defaultPrevented) return
    const action = form.getAttribute('action') || ''
    if (!action.includes('/cart/add')) return

    event.preventDefault()
    this.#addToCart(form)
  }

  async #addToCart(form) {
    const button =
      form.querySelector('[type="submit"]') ||
      (form.id ? document.querySelector(`[type="submit"][form="${form.id}"]`) : null)
    const formData = new FormData(form)

    if (!formData.get('id')) {
      console.warn('[CartDrawer] add-to-cart form has no variant id input', form)
      return
    }

    button?.classList.add('is-loading')
    button?.setAttribute('disabled', 'true')

    try {
      const response = await fetch(`${form.getAttribute('action').split('?')[0]}.js`, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        console.warn('[CartDrawer] add failed', response.status, await response.text())
        return
      }
      await this.#refresh()
      this.#open()
    } catch (error) {
      console.error('[CartDrawer] add error', error)
    } finally {
      button?.classList.remove('is-loading')
      button?.removeAttribute('disabled')
    }
  }

  async #refresh() {
    try {
      const response = await fetch(`${window.location.pathname}?section_id=${this.#sectionId}`)
      if (!response.ok) return
      const html = await response.text()
      const doc = new DOMParser().parseFromString(html, 'text/html')

      const freshTarget = doc.querySelector('[data-cart-drawer-target]')
      if (freshTarget && this.#target) this.#target.innerHTML = freshTarget.innerHTML

      const freshCount = doc.querySelector('[data-cart-drawer-count]')
      if (freshCount && this.#drawerCount) this.#drawerCount.textContent = freshCount.textContent

      const countText = freshCount ? freshCount.textContent.replace(/[()]/g, '').trim() : ''
      for (const badge of document.querySelectorAll('[data-cart-count]')) {
        badge.textContent = countText
        badge.hidden = countText === '0'
      }
    } catch {
      // network error — drawer keeps its last known state
    }
  }
}

class CartPageForm {
  constructor(form) {
    for (const wrapper of form.querySelectorAll('[data-cart-quantity]')) {
      const input = wrapper.querySelector('.quantity-selector__input')
      if (!input) continue

      wrapper.querySelector('[data-quantity-minus]')?.addEventListener('click', () => {
        input.value = Math.max(0, Number(input.value) - 1)
        form.requestSubmit()
      })
      wrapper.querySelector('[data-quantity-plus]')?.addEventListener('click', () => {
        input.value = Number(input.value) + 1
        form.requestSubmit()
      })
      input.addEventListener('change', () => form.requestSubmit())
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // new MobileNav()
  new ReelVideos()

  const heroSlider = document.querySelector('[data-hero-slider]')
  if (heroSlider) new HeroSlider(heroSlider)

  for (const slider of document.querySelectorAll('[data-slider]')) new CardSlider(slider)

  const header = document.querySelector('.header')
  if (header) new HeaderScroll(header)

  const headerNav = document.querySelector('.header__nav')
  if (headerNav) new HeaderMegaMenu(headerNav)

  for (const gallery of document.querySelectorAll('[data-product-gallery]')) new ProductGallery(gallery)
  for (const picker of document.querySelectorAll('[data-variant-picker]')) new VariantPicker(picker)
  for (const selector of document.querySelectorAll('[data-quantity-selector]')) new QuantitySelector(selector)
  for (const share of document.querySelectorAll('[data-share]')) new ShareButton(share)
  for (const facade of document.querySelectorAll('[data-youtube-facade]')) new YouTubeFacade(facade)
  for (const rec of document.querySelectorAll('[data-product-recommendations]')) new ProductRecommendations(rec)

  const discountPopup = document.querySelector('[data-discount-popup]')
  if (discountPopup) new DiscountPopup(discountPopup)

  const predictiveSearch = document.querySelector('[data-predictive-search]')
  if (predictiveSearch) new PredictiveSearch(predictiveSearch)

  const cartDrawer = document.querySelector('[data-cart-drawer]')
  if (cartDrawer) new CartDrawer(cartDrawer)

  const cartPageForm = document.querySelector('.cart-page__layout')?.closest('form')
  if (cartPageForm) new CartPageForm(cartPageForm)

  for (const reviews of document.querySelectorAll('[data-review-form-wrapper]')) new ReviewForm(reviews)
})


class StickyProductATC {

  constructor(){

    this.bar = document.querySelector('[data-sticky-atc]')
    this.button = document.querySelector('[data-sticky-atc-button]')

    this.mainATC = document.querySelector('.product__add-to-cart')
    this.footer = document.querySelector('footer.footer')

    this.form = this.mainATC?.closest('form')

    this.mainATCVisible = false
    this.footerVisible = false

    if(!this.bar || !this.button || !this.mainATC || !this.form)
      return


    this.observeATC()
    this.observeFooter()


    this.button.addEventListener(
      'click',
      ()=> {
        this.form.requestSubmit()
      }
    )

  }


  observeATC(){

    const observer = new IntersectionObserver(
      ([entry])=>{

        this.mainATCVisible = entry.isIntersecting

        this.updateVisibility()

      },
      {
        threshold:0.1
      }
    )


    observer.observe(this.mainATC)

  }


  observeFooter(){

    if(!this.footer) return


    const observer = new IntersectionObserver(
      ([entry])=>{

        this.footerVisible = entry.isIntersecting

        this.updateVisibility()

      },
      {
        threshold:0.1
      }
    )


    observer.observe(this.footer)

  }


  updateVisibility(){

    if(this.mainATCVisible || this.footerVisible){

      this.hide()

    }else{

      this.show()

    }

  }


  show(){

    this.bar.classList.add('is-visible')

  }


  hide(){

    this.bar.classList.remove('is-visible')

  }

}


document.addEventListener('DOMContentLoaded', () => {
  new StickyProductATC()
})
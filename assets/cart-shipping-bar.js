if (!customElements.get('cart-shipping-bar')) {
  class CartShippingBar extends HTMLElement {
    connectedCallback() {
      this.message = this.querySelector('[data-shipping-bar-message]');
      this.fill = this.querySelector('[data-shipping-bar-fill]');
      this.threshold = parseInt(this.dataset.thresholdCents, 10) || 0;

      this._onCartChange = () => this.refresh();
      this._events = ['cart:add', 'cart:updated', 'cart:change', 'cart:refresh'];
      this._events.forEach((evt) => document.addEventListener(evt, this._onCartChange));
    }

    disconnectedCallback() {
      this._events.forEach((evt) => document.removeEventListener(evt, this._onCartChange));
    }

    async refresh() {
      try {
        const response = await fetch('/cart.js');
        const cart = await response.json();
        this.render(cart.total_price);
      } catch (error) {
        console.error('Free shipping bar: could not refresh cart', error);
      }
    }

    render(totalPriceCents) {
      if (!this.threshold) return;

      const achieved = totalPriceCents >= this.threshold;
      const pct = achieved ? 100 : Math.floor((totalPriceCents / this.threshold) * 100);

      if (this.fill) this.fill.style.width = pct + '%';

      if (this.message) {
        if (achieved) {
          this.message.textContent = this.dataset.messageAchieved;
        } else {
          const remaining = this.threshold - totalPriceCents;
          this.message.textContent = (this.dataset.messageBelow || '').replace('[amount]',this.formatMoney(remaining));
        }
      }
    }

    formatMoney(cents) {
        const format = this.dataset.moneyFormat || '${{amount}}';
        const value = (cents / 100).toFixed(2);

        return format.replace(/\{\{\s*amount\s*\}\}/g, value);
    }
  }

  customElements.define('cart-shipping-bar', CartShippingBar);
}
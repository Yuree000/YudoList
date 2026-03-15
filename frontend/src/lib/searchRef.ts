// Module-level reference to the search input element.
// Allows global keyboard shortcuts (Ctrl+K) to focus the search bar
// without requiring prop drilling or React context.

let searchInputEl: HTMLInputElement | null = null;

export function registerSearchInput(el: HTMLInputElement | null) {
  searchInputEl = el;
}

export function focusSearchInput() {
  if (!searchInputEl) return;
  searchInputEl.focus();
  searchInputEl.select();
}

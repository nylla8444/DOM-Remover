// content.js - DOM remover (robust + live updates)

let observer = null;

function safeRemove(selectors) {
    if (!Array.isArray(selectors) || selectors.length === 0) return;
    selectors.forEach(sel => {
        try {
            // querySelectorAll can throw if selector is invalid, so try/catch per selector
            const nodes = document.querySelectorAll(sel);
            nodes.forEach(n => n.remove());
        } catch (err) {
            // invalid selector — ignore but log for debugging
            console.warn('DOM Remover: invalid selector skipped ->', sel, err);
        }
    });
}

function startObserving(selectors) {
    // run once immediately
    safeRemove(selectors);

    // clear any existing observer
    if (observer) observer.disconnect();

    // observe for dynamic changes
    observer = new MutationObserver(() => safeRemove(selectors));
    const root = document.body || document.documentElement;
    if (root) {
        observer.observe(root, { childList: true, subtree: true });
    }
}

function stopObserving() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

// Initialize from storage (defaults: selectors = [], isEnabled = true)
chrome.storage.sync.get({ selectors: [], isEnabled: true }, ({ selectors, isEnabled }) => {
    if (isEnabled && Array.isArray(selectors) && selectors.length > 0) {
        startObserving(selectors);
    } else {
        stopObserving();
    }
});

// React to changes made in the popup immediately
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    // re-read both values (keeps logic simple)
    chrome.storage.sync.get({ selectors: [], isEnabled: true }, ({ selectors, isEnabled }) => {
        if (isEnabled && Array.isArray(selectors) && selectors.length > 0) {
            startObserving(selectors);
        } else {
            stopObserving();
        }
    });
});

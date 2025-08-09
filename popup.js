// popup.js

const selectorInput = document.getElementById('selectorInput');
const addSelectorBtn = document.getElementById('addSelectorBtn');
const selectorList = document.getElementById('selectorList');
const enableToggle = document.getElementById('enableToggle');
const toggleLabel = document.getElementById('toggleLabel');
const removeNowBtn = document.getElementById('removeNowBtn');
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');

function showStatus(msg, ms = 2000) {
    statusEl.textContent = msg;
    if (ms > 0) setTimeout(() => statusEl.textContent = '', ms);
}

function renderSelectors(list) {
    selectorList.innerHTML = '';
    countEl.textContent = list.length;
    list.forEach((sel, index) => {
        const li = document.createElement('li');
        const text = document.createElement('div');
        text.textContent = sel;
        text.style.wordBreak = 'break-all';

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Delete';
        removeBtn.addEventListener('click', () => {
            // remove by index from latest storage (safer)
            chrome.storage.sync.get({ selectors: [] }, ({ selectors }) => {
                if (!Array.isArray(selectors)) selectors = [];
                selectors.splice(index, 1);
                chrome.storage.sync.set({ selectors }, () => {
                    renderSelectors(selectors);
                    showStatus('Selector removed');
                });
            });
        });

        actions.appendChild(removeBtn);
        li.appendChild(text);
        li.appendChild(actions);
        selectorList.appendChild(li);
    });
}

// Load initial settings
function loadSettings() {
    chrome.storage.sync.get({ selectors: [], isEnabled: true }, ({ selectors, isEnabled }) => {
        renderSelectors(Array.isArray(selectors) ? selectors : []);
        enableToggle.checked = !!isEnabled;
        toggleLabel.textContent = enableToggle.checked ? 'Enabled' : 'Disabled';
    });
}

// Add selector
addSelectorBtn.addEventListener('click', () => {
    const newSel = selectorInput.value.trim();
    if (!newSel) return showStatus('Enter a selector first');
    chrome.storage.sync.get({ selectors: [] }, ({ selectors }) => {
        if (!Array.isArray(selectors)) selectors = [];
        // avoid exact duplicates
        if (selectors.includes(newSel)) {
            showStatus('Selector already exists');
            selectorInput.value = '';
            return;
        }
        selectors.push(newSel);
        chrome.storage.sync.set({ selectors }, () => {
            renderSelectors(selectors);
            selectorInput.value = '';
            showStatus('Selector added');
        });
    });
});

// Toggle enable/disable
enableToggle.addEventListener('change', () => {
    const enabled = enableToggle.checked;
    chrome.storage.sync.set({ isEnabled: enabled }, () => {
        toggleLabel.textContent = enabled ? 'Enabled' : 'Disabled';
        showStatus(enabled ? 'Enabled' : 'Disabled');
    });
});

// Remove Now (active tab)
removeNowBtn.addEventListener('click', () => {
    chrome.storage.sync.get({ selectors: [] }, ({ selectors }) => {
        if (!Array.isArray(selectors) || selectors.length === 0) {
            return showStatus('No selectors saved');
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) return showStatus('No active tab');
            const tabId = tabs[0].id;

            chrome.scripting.executeScript({
                target: { tabId },
                func: (selectorsArg) => {
                    try {
                        selectorsArg.forEach(sel => {
                            try {
                                document.querySelectorAll(sel).forEach(n => n.remove());
                            } catch (e) {
                                // invalid selector -> ignore
                                console.warn('RemoveNow invalid selector', sel, e);
                            }
                        });
                    } catch (e) {
                        console.error('RemoveNow error', e);
                    }
                },
                args: [selectors]
            }, () => {
                showStatus('Removed on active tab');
            });
        });
    });
});

// Export (copy to clipboard)
exportBtn.addEventListener('click', async () => {
    chrome.storage.sync.get({ selectors: [] }, async ({ selectors }) => {
        const text = JSON.stringify(selectors || [], null, 2);
        try {
            await navigator.clipboard.writeText(text);
            showStatus('Exported to clipboard');
        } catch (e) {
            // fallback prompt
            window.prompt('Copy selectors JSON:', text);
        }
    });
});

// Import (prompt for JSON array)
importBtn.addEventListener('click', () => {
    const raw = window.prompt('Paste JSON array of selectors (e.g. ["#a",".b"]):');
    if (!raw) return;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('Not an array');
        // sanitize items to strings
        const cleaned = parsed.map(String).map(s => s.trim()).filter(Boolean);
        chrome.storage.sync.set({ selectors: cleaned }, () => {
            renderSelectors(cleaned);
            showStatus('Import successful');
        });
    } catch (err) {
        showStatus('Invalid JSON');
    }
});


// load on open
document.addEventListener('DOMContentLoaded', loadSettings);

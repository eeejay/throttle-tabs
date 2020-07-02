const DEFAULTS = {
  tabLimit: 10,
  overflowLimit: 50,
  limitOverflow: false
};

function defaults() {
  return DEFAULTS;
}

async function cleanup(toKeep=[]) {
  let windows = await browser.windows.getAll({ windowTypes: ["normal"] });
  for (let win of windows) {
    let settings = await browser.sessions.getWindowValue(win.id, "unclutter-settings");
    if (!settings) {
      settings = DEFAULTS;
    }
    await cleanupWindow(win.id, settings, toKeep);
  }
}

async function cleanupWindow(windowId, settings, toKeep=[]) {
  let tabs = await browser.tabs.query({ windowId, pinned: false, hidden: false });
  let tabCount = tabs.length;
  let sorted = tabs.sort((a, b) => a.lastAccessed - b.lastAccessed);

  while (tabCount > settings.tabLimit) {
    let toHide = sorted.shift();
    if (toHide.audible || toKeep.includes(toHide.id)) {
      continue;
    }

    try {
      await browser.tabs.hide(toHide.id);
      tabCount--;
    } catch (e) {
      console.debug("Can't hide tab:", e, toHide);
    }
  }

  if (tabCount == tabs.length) {
    // We didn't need to hide anything, lets see if we should unhide.
    tabs = await browser.tabs.query({ windowId, pinned: false, hidden: true });
    sorted = tabs.sort((a, b) => a.lastAccessed - b.lastAccessed);
    while (tabCount < settings.tabLimit && sorted.length) {
      dump(`hello ${tabCount} ${settings.tabLimit}\n`);
      let toShow = sorted.pop();
      try {
        await browser.tabs.show(toShow.id);
        tabCount++;
      } catch (e) {
        console.debug("Can't close tab:", e, toShow);
      }
    }
  }

  if (settings.limitOverflow) {
    let overflowCount = sorted.length;
    while (overflowCount > settings.overflowLimit) {
      let toClose = sorted.shift();
      try {
        await browser.tabs.remove(toClose.id);
        overflowCount--;
      } catch (e) {
        console.debug("Can't remove tab:", e, toClose);
      }
    }
  }
}

browser.tabs.onCreated.addListener(() => cleanup());
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.hidden == false) {
    cleanup([tab.id]);
  }
});

cleanup();

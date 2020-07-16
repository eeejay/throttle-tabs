let overflow_list = "";

async function updateUI() {
  let win = await browser.windows.getCurrent();
  let settings = await browser.sessions.getWindowValue(win.id, "unclutter-settings");
  if (!settings) {
    let bg = await browser.runtime.getBackgroundPage();
    settings = bg.defaults();
  }

  document.getElementById("max-tabs").valueAsNumber = settings.tabLimit;
  document.getElementById("max-overflow").valueAsNumber = settings.overflowLimit;
  document.getElementById("enable-overflow-limit").checked = settings.limitOverflow;
  updateOverflowControls();

  let tabs = await browser.tabs.query({currentWindow: true, hidden: true});
  tabs = tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);

  if (overflow_list != tabs.map(t => t.id).join(",")) {
    let tabsList = document.getElementById('hidden-tabs-list');
    tabsList.textContent = "";
    for (let tab of tabs) {
      let item = document.getElementById("panel-item").content.cloneNode(true);
      item.querySelector(".text").textContent = tab.title;
      if (tab.favIconUrl) {
        item.querySelector(".icon").src = tab.favIconUrl;
      }
      item.querySelector(".panel-list-item").addEventListener("click", () => showTab(tab.id));
      tabsList.appendChild(item);
    }

    overflow_list = tabs.map(t => t.id).join(",");
  }
}

async function showTab(tabId) {
  await browser.tabs.move(tabId, { index: -1 });
  await browser.tabs.update(tabId, { active: true });
  window.close();
}

function increment(evt) {
  let input = document.getElementById(evt.target.getAttribute("aria-controls"));
  input.stepUp();
  updateSettings();
}

for (let btn of document.querySelectorAll(".increment-button")) {
  btn.addEventListener("click", increment);
}

function decrement(evt) {
  let input = document.getElementById(evt.target.getAttribute("aria-controls"));
  input.stepDown();
  updateSettings();
}

for (let btn of document.querySelectorAll(".decrement-button")) {
  btn.addEventListener("click", decrement);
}

for (let input of document.querySelectorAll("input[type=number]")) {
  input.addEventListener("input", updateSettings);
}

function updateOverflowControls() {
  let checkbox = document.getElementById("enable-overflow-limit");
  for (let input of checkbox.parentElement.querySelectorAll("input:not([type=checkbox])")) {
    input.disabled = !checkbox.checked;
  }
}
document.getElementById("enable-overflow-limit").addEventListener("change", () => {
  updateOverflowControls();
  updateSettings();
});

document.getElementById('hidden-tabs-list').addEventListener("keydown", function handleKeydown(evt) {
  if (!["ArrowDown", "ArrowUp"].includes(evt.key)) {
    return;
  }

  let items = Array.from(document.querySelectorAll(".panel-list-item"));
  let focusedIndex = items.findIndex(e => e == document.activeElement);
  let nextIndex = focusedIndex;
  if (evt.key == "ArrowDown") {
    nextIndex = (nextIndex + 1) % items.length;
  } else {
    if (--nextIndex < 0) {
      nextIndex = items.length - 1;
    }
  }

  items[nextIndex].focus();
});

async function updateSettings() {
  let tabLimit = document.getElementById("max-tabs").valueAsNumber;
  let overflowLimit = document.getElementById("max-overflow").valueAsNumber;
  let limitOverflow = document.getElementById("enable-overflow-limit").checked;
  let settings = { tabLimit, overflowLimit, limitOverflow };
  let win = await browser.windows.getCurrent();
  await browser.sessions.setWindowValue(win.id, "unclutter-settings", settings);
  let bg = await browser.runtime.getBackgroundPage();
  await bg.cleanupWindow(win.id, settings);
  updateUI();
}

document.addEventListener("DOMContentLoaded", updateUI);

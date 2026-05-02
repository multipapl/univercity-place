import { DOCK_CATEGORIES } from "./dockConfig.js";

function renderCategoryPanel(category, viewerConfig) {
  const cardsMarkup = category.items.map((item) => `
    <section
      class="category-card"
      data-category-card="${category.id}:${item.id}"
      data-category-card-modes="${item.modes.join(" ")}"
    >
      <h3>${item.label}</h3>
      ${item.render({ viewerConfig })}
    </section>
  `).join("");

  return `
    <section class="category-panel" data-category-panel="${category.id}" hidden>
      ${cardsMarkup}
      <section class="category-panel-empty" data-category-empty hidden>
        <h3>${category.label}</h3>
        <p>No items available.</p>
      </section>
    </section>
  `;
}

export function createLeftSidebar({ viewerConfig }) {
  const sidebar = document.createElement("div");
  sidebar.className = "left-sidebar";
  sidebar.dataset.leftSidebar = "";
  sidebar.hidden = true;
  sidebar.innerHTML = `
    <div class="left-sidebar-shell">
      <div class="left-sidebar-header">
        <h2 data-sidebar-title>Viewport</h2>
      </div>
      <div class="left-sidebar-panels" data-sidebar-panels>
        ${DOCK_CATEGORIES.map((category) => renderCategoryPanel(category, viewerConfig)).join("")}
      </div>
    </div>
  `;

  return {
    sidebar,
    titleElement: sidebar.querySelector("[data-sidebar-title]"),
    panelsElement: sidebar.querySelector("[data-sidebar-panels]"),
  };
}

export function showSidebarCategory({ sidebarElement, titleElement, categoryId, mode }) {
  const panels = sidebarElement?.querySelectorAll("[data-category-panel]") ?? [];
  const category = DOCK_CATEGORIES.find((entry) => entry.id === categoryId);
  if (!category) {
    return;
  }

  if (titleElement) {
    titleElement.textContent = category.label;
  }

  panels.forEach((panel) => {
    const isActivePanel = panel.dataset.categoryPanel === categoryId;
    panel.hidden = !isActivePanel;

    if (!isActivePanel) {
      return;
    }

    const cards = [...panel.querySelectorAll("[data-category-card]")];
    let visibleCount = 0;

    cards.forEach((card) => {
      const supportsMode = (card.dataset.categoryCardModes || "")
        .split(/\s+/)
        .filter(Boolean)
        .includes(mode);
      card.hidden = !supportsMode;
      if (supportsMode) {
        visibleCount += 1;
      }
    });

    const emptyState = panel.querySelector("[data-category-empty]");
    if (emptyState) {
      emptyState.hidden = visibleCount > 0;
    }
  });
}

export function setSidebarOpen(sidebarElement, isOpen) {
  if (!sidebarElement) {
    return;
  }

  sidebarElement.hidden = !isOpen;
  sidebarElement.classList.toggle("is-open", isOpen);
}

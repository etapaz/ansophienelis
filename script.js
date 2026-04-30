const header = document.querySelector(".site-header");
const toggle = document.querySelector(".menu-toggle");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const parser = new DOMParser();

let isNavigating = false;

if (header && toggle) {
  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

// Buttons Initialization
function initButtons() {
  // Back to Top Button
  let backToTop = document.querySelector(".back-to-top");
  if (!backToTop) {
    backToTop = document.createElement("button");
    backToTop.className = "back-to-top";
    backToTop.setAttribute("aria-label", "Retour en haut");
    backToTop.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
      <span>Haut</span>
    `;
    document.body.appendChild(backToTop);
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Handle scroll visibility (only once)
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTop.classList.add("is-visible");
      } else {
        backToTop.classList.remove("is-visible");
      }
    });
  }
}

// Initialize on load
initButtons();

document.addEventListener("click", async (event) => {
  const link = event.target.closest("a");
  if (!link) {
    return;
  }

  if (!shouldHandleLink(link, event)) {
    closeMenu();
    return;
  }

  event.preventDefault();
  const didNavigate = await navigateTo(new URL(link.href), true);
  if (didNavigate) {
    closeMenu();
  }
});

window.addEventListener("popstate", () => {
  navigateTo(new URL(window.location.href), false);
});

function shouldHandleLink(link, event) {
  const href = link.getAttribute("href");
  const target = link.getAttribute("target");

  if (!href || target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const nextUrl = new URL(href, window.location.href);
  const isPageLink = nextUrl.pathname.endsWith(".html") || nextUrl.pathname === "/" || nextUrl.pathname.endsWith("/");
  const samePath = normalizePath(nextUrl.pathname) === normalizePath(window.location.pathname);
  const samePage = samePath && nextUrl.hash === window.location.hash;

  return nextUrl.origin === window.location.origin && isPageLink && !samePath && !samePage;
}

async function navigateTo(nextUrl, shouldPushState) {
  if (isNavigating) {
    return;
  }

  isNavigating = true;
  document.body.classList.add("is-navigating");
  const currentMain = document.querySelector("main");
  const currentFooter = document.querySelector("footer");

  try {
    const response = await fetch(nextUrl.href, {
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      throw new Error(`Navigation failed: ${response.status}`);
    }

    const html = await response.text();
    const nextDocument = parser.parseFromString(html, "text/html");
    const nextMain = nextDocument.querySelector("main");

    if (!nextMain) {
      throw new Error("Navigation failed: missing main element");
    }

    currentMain?.classList.remove("page-enter");
    currentFooter?.classList.remove("page-enter");

    if (!reduceMotion) {
      currentMain?.classList.add("page-leave");
      currentFooter?.classList.add("page-leave");
      await wait(160);
    }

    document.title = nextDocument.title;
    syncHeadMeta(nextDocument);
    replacePagePart("main", nextMain);
    replaceFooter(nextDocument.querySelector("footer"));
    updateCurrentNavigation(nextUrl);

    if (shouldPushState) {
      window.history.pushState({}, "", nextUrl.href);
    }

    window.scrollTo(0, 0);
    animateNewPage();
    return true;
  } catch (error) {
    window.location.href = nextUrl.href;
    return false;
  } finally {
    isNavigating = false;
    window.setTimeout(() => {
      document.body.classList.remove("is-navigating");
    }, 80);
  }
}

function closeMenu() {
  header?.classList.remove("is-open");
  toggle?.setAttribute("aria-expanded", "false");
}

function replacePagePart(selector, nextElement) {
  const currentElement = document.querySelector(selector);
  currentElement?.replaceWith(nextElement);
}

function replaceFooter(nextFooter) {
  const currentFooter = document.querySelector("footer");

  if (currentFooter && nextFooter) {
    currentFooter.replaceWith(nextFooter);
    return;
  }

  if (currentFooter && !nextFooter) {
    currentFooter.remove();
    return;
  }

  if (!currentFooter && nextFooter) {
    document.querySelector("main")?.after(nextFooter);
  }
}

function syncHeadMeta(nextDocument) {
  ["description", "robots"].forEach((name) => {
    const current = document.head.querySelector(`meta[name="${name}"]`);
    const next = nextDocument.head.querySelector(`meta[name="${name}"]`);

    if (current && next) {
      current.setAttribute("content", next.getAttribute("content") || "");
    } else if (current && !next) {
      current.remove();
    } else if (!current && next) {
      document.head.append(next.cloneNode(true));
    }
  });
}

function updateCurrentNavigation(nextUrl) {
  document.querySelectorAll(".nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http")) {
      link.removeAttribute("aria-current");
      return;
    }

    const linkUrl = new URL(href, window.location.href);
    if (normalizePath(linkUrl.pathname) === normalizePath(nextUrl.pathname)) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function animateNewPage() {
  if (reduceMotion) {
    return;
  }

  requestAnimationFrame(() => {
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");

    main?.classList.add("page-enter");
    footer?.classList.add("page-enter");
    main?.addEventListener("animationend", () => main.classList.remove("page-enter"), { once: true });
    footer?.addEventListener("animationend", () => footer.classList.remove("page-enter"), { once: true });
  });
}

function normalizePath(pathname) {
  return pathname.replace(/\/$/, "/index.html").replace(/^\/$/, "/index.html");
}

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

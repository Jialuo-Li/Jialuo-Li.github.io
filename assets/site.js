// Optional enhancements only: every piece of content is in the HTML and works without this file.
(function () {
  "use strict";

  var root = document.documentElement;

  // Theme toggle: follows the system theme until the reader chooses one.
  var toggle = document.querySelector(".theme-toggle");
  var supportsLightDark = window.CSS && CSS.supports && CSS.supports("color", "light-dark(#000, #fff)");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function currentTheme() {
    return root.dataset.theme || (systemDark.matches ? "dark" : "light");
  }

  function syncToggle() {
    if (toggle) toggle.setAttribute("aria-pressed", String(currentTheme() === "dark"));
  }

  if (toggle && supportsLightDark) {
    toggle.hidden = false;
    syncToggle();
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch (error) {}
      syncToggle();
    });
    systemDark.addEventListener("change", syncToggle);
  }

  // Copy the email address.
  if (navigator.clipboard) {
    document.querySelectorAll(".copy-btn").forEach(function (button) {
      var label = button.querySelector(".visually-hidden");
      button.hidden = false;
      button.addEventListener("click", function () {
        navigator.clipboard.writeText(button.dataset.copy).then(function () {
          button.classList.add("is-copied");
          label.textContent = "Email address copied";
          setTimeout(function () {
            button.classList.remove("is-copied");
            label.textContent = "Copy email address";
          }, 1800);
        });
      });
    });
  }

  // Mobile menu: close after choosing a section, on Escape, or on an outside click.
  var menu = document.querySelector(".mobile-menu");
  if (menu) {
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) menu.open = false;
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.open) {
        menu.open = false;
        menu.querySelector("summary").focus();
      }
    });
    document.addEventListener("click", function (event) {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }

  // Highlight the section currently in view.
  var navLinks = document.querySelectorAll(".site-nav a, .mobile-menu a");
  if ("IntersectionObserver" in window && navLinks.length) {
    var sections = Array.prototype.map.call(document.querySelectorAll(".site-nav a"), function (link) {
      return document.querySelector(link.getAttribute("href"));
    }).filter(Boolean);
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          if (link.getAttribute("href") === "#" + entry.target.id) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-35% 0px -60% 0px" });
    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  // Back-to-top button appears after the first screen.
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    toTop.hidden = false;
    var update = function () {
      var visible = window.scrollY > window.innerHeight * 0.9;
      toTop.classList.toggle("is-visible", visible);
      toTop.tabIndex = visible ? 0 : -1;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }
})();

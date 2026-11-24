// Close the Projects dropdown on outside click, Escape, or after choosing a link.
(() => {
  const menus = document.querySelectorAll(".site-nav details");
  document.addEventListener("click", (e) => {
    menus.forEach((d) => { if (d.open && !d.contains(e.target)) d.open = false; });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    menus.forEach((d) => {
      if (d.open) { d.open = false; d.querySelector("summary").focus(); }
    });
  });
})();

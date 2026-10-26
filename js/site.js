// ============================================================
// 대치베스트어학원 — 공통 스크립트
// 머리글(메가 메뉴) · 바닥글 · 설정값 채우기 · 신청 폼
// ============================================================
(() => {
  const S = window.SITE || {};
  const page = document.body.dataset.page || "home";

  // 메뉴 구조: 상위 5개 · 하위 20개
  const MENU = [
    { key: "about", label: "학원소개", href: "about.html", items: [
      ["인사말", "about.html#greeting"],
      ["입학테스트", "test.html"],
      ["학원시스템", "about.html#system"],
      ["입시로드맵", "about.html#roadmap"]
    ]},
    { key: "elementary", label: "초등부", href: "elementary.html", items: [
      ["정규프로그램", "elementary.html#regular"],
      ["클리닉 프로그램", "elementary.html#clinic"],
      ["시간표", "elementary.html#timetable"],
      ["관리시스템", "elementary.html#care"]
    ]},
    { key: "middle", label: "중등부", href: "middle.html", items: [
      ["정규프로그램", "middle.html#regular"],
      ["내신프로그램", "middle.html#exam"],
      ["시간표", "middle.html#timetable"],
      ["관리시스템", "middle.html#care"]
    ]},
    { key: "high", label: "고등부", href: "high.html", items: [
      ["정규프로그램", "high.html#regular"],
      ["내신프로그램", "high.html#exam"],
      ["시간표", "high.html#timetable"],
      ["관리시스템", "high.html#care"]
    ]},
    { key: "info", label: "입시정보", href: "info.html", items: [
      ["교육정보", "info.html#edu"],
      ["설명회 소식", "info.html#events"],
      ["성공 후기", "info.html#reviews"],
      ["FAQ", "info.html#faq"]
    ]}
  ];

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- 상단 띠 ----------
  const topbar = () => S.notice ? `
    <div class="topbar">
      <span>대치동 영어 전문 · 초등부 · 중등부 · 고등부</span>
      <strong>${esc(S.notice)}</strong>
    </div>` : "";

  // ---------- 머리글 ----------
  const header = () => {
    const navItems = MENU.map((m) =>
      `<li><a href="${m.href}"${page === m.key || (page === "test" && m.key === "about") ? ' class="is-active"' : ""}>${m.label}</a></li>`
    ).join("");
    const cols = MENU.map((m) => `
      <div class="mega-col">
        <a class="mega-title" href="${m.href}">${m.label}</a>
        ${m.items.map(([label, href]) => `<a href="${href}">${label}</a>`).join("")}
      </div>`).join("");
    const login = S.loginUrl ? `<a class="login" href="${esc(S.loginUrl)}">로그인</a>` : "";
    return `
    <header class="site-header" id="siteHeader">
      <div class="header-inner">
        <a class="brand" href="index.html">
          <img src="img/logo.svg" alt="" width="36" height="36" />
          <span>${esc(S.name || "대치베스트어학원")}</span>
        </a>
        <ul class="nav" aria-label="주요 메뉴">${navItems}</ul>
        <div class="header-actions">
          <a class="btn btn--outline" href="test.html">입학 테스트</a>
          ${login}
          <button class="menu-toggle" id="menuToggle" aria-label="메뉴 열기" aria-expanded="false"><span></span><span></span><span></span></button>
        </div>
      </div>
      <div class="mega" id="mega">
        <div class="mega-inner">
          <div class="mega-cols">${cols}</div>
        </div>
      </div>
    </header>`;
  };

  // ---------- 바닥글 ----------
  const footer = () => {
    const cols = MENU.map((m) => `
      <div>
        <b>${m.label}</b>
        ${m.items.map(([label, href]) => `<a href="${href}">${label}</a>`).join("")}
      </div>`).join("");
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand">
            <b>${esc(S.name || "대치베스트어학원")}</b>
            <p>대치동 영어 전문 · 초등부 · 중등부 · 고등부<br>
            ${esc(S.registrationNo)} · ${esc(S.owner)} · ${esc(S.bizNo)}<br>
            ${esc(S.address)} · ${esc(S.phone)}</p>
          </div>
          <nav class="footer-nav" aria-label="푸터 메뉴">${cols}</nav>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} ${esc(S.name || "대치베스트어학원")}. All rights reserved.</span>
          <div><a href="privacy.html">개인정보처리방침</a></div>
        </div>
      </div>
    </footer>
    <a class="call-fab" href="tel:${esc((S.phone || "").replace(/[^0-9+]/g, ""))}" aria-label="전화 걸기">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>
    </a>`;
  };

  // ---------- 삽입 ----------
  const mount = (id, html) => { const el = document.getElementById(id); if (el) el.outerHTML = html; };
  mount("site-topbar", topbar());
  mount("site-header", header());
  mount("site-footer", footer());

  // 설정값 채우기: <span data-bind="phone"></span>
  document.querySelectorAll("[data-bind]").forEach((el) => {
    const v = S[el.dataset.bind];
    if (v != null && v !== "") el.textContent = v;
  });
  document.querySelectorAll("[data-tel]").forEach((a) => { a.href = "tel:" + String(S.phone || "").replace(/[^0-9+]/g, ""); });

  // ---------- 메가 메뉴 동작 ----------
  const hdr = document.getElementById("siteHeader");
  const toggle = document.getElementById("menuToggle");
  const isMobile = () => window.matchMedia("(max-width: 860px)").matches;
  let closeTimer = 0;
  if (hdr) {
    hdr.addEventListener("mouseenter", () => { if (isMobile()) return; clearTimeout(closeTimer); hdr.classList.add("is-open"); });
    hdr.addEventListener("mouseleave", () => { if (isMobile()) return; closeTimer = setTimeout(() => hdr.classList.remove("is-open"), 120); });
    hdr.addEventListener("focusin", () => { if (!isMobile()) hdr.classList.add("is-open"); });
    hdr.addEventListener("focusout", (e) => { if (!hdr.contains(e.relatedTarget)) hdr.classList.remove("is-open"); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { hdr.classList.remove("is-open", "is-mobile-open"); if (toggle) toggle.setAttribute("aria-expanded", "false"); } });
  }
  if (toggle && hdr) {
    toggle.addEventListener("click", () => {
      const open = hdr.classList.toggle("is-mobile-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    });
    hdr.querySelectorAll(".mega a").forEach((a) => a.addEventListener("click", () => hdr.classList.remove("is-open", "is-mobile-open")));
  }

  // ---------- 지도 ----------
  document.querySelectorAll(".map-box").forEach((box) => {
    if (S.mapEmbedUrl) box.innerHTML = `<iframe src="${esc(S.mapEmbedUrl)}" title="오시는 길 지도" loading="lazy" allowfullscreen></iframe>`;
  });

  // ---------- 신청 폼 ----------
  const form = document.getElementById("applyForm");
  if (form) {
    const msg = document.getElementById("formMsg");
    const show = (ok, text) => { msg.textContent = text; msg.className = "form-msg " + (ok ? "is-ok" : "is-err"); };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.consent) { show(false, "개인정보 수집·이용에 동의해 주세요."); return; }
      const lines = [
        `[입학테스트 신청] ${data.name} (${data.grade})`,
        `학교: ${data.school || "-"}`,
        `학부모 연락처: ${data.phone}`,
        `희망 부서·프로그램: ${data.program}`,
        `문의 내용: ${data.message || "-"}`
      ];
      if (S.formEndpoint) {
        const btn = form.querySelector("button[type=submit]");
        btn.disabled = true;
        try {
          const res = await fetch(S.formEndpoint, { method: "POST", headers: { "Accept": "application/json" }, body: new FormData(form) });
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          show(true, "신청이 접수되었습니다. 영업일 기준 1일 이내에 담임 선생님이 연락드립니다.");
        } catch (err) {
          show(false, "전송에 실패했습니다. 전화(" + (S.phone || "") + ")로 문의해 주세요.");
        } finally { btn.disabled = false; }
      } else {
        const subject = encodeURIComponent(`[입학테스트 신청] ${data.name} · ${data.grade}`);
        const body = encodeURIComponent(lines.join("\n"));
        window.location.href = `mailto:${S.formEmail || ""}?subject=${subject}&body=${body}`;
        show(true, "이메일 작성 화면이 열립니다. 전송 버튼을 눌러 주시면 접수됩니다.");
      }
    });
  }

  // 페이지 탭 활성 표시 (서브 페이지 내 앵커)
  const tabs = document.querySelectorAll(".page-tabs a");
  if (tabs.length) {
    const setActive = () => {
      const hash = window.location.hash;
      tabs.forEach((a) => a.classList.toggle("is-active", hash && a.getAttribute("href").endsWith(hash)));
    };
    window.addEventListener("hashchange", setActive);
    setActive();
  }
})();

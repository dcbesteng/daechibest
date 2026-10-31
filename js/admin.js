// ============================================================
// 대치베스트어학원 — 관리자 모드
// 화면에서 문구·표·목록을 직접 고치고 저장하면 GitHub(data/site.json)에 반영됩니다.
// 비밀번호는 해시로만 저장되고, GitHub 토큰은 관리자 브라우저(localStorage)에만 남습니다.
// ============================================================
(() => {
  const REPO = "dcbesteng/daechibest";
  const BRANCH = "main";
  const DATA_PATH = "data/site.json";
  const API = `https://api.github.com/repos/${REPO}/contents/`;
  const TOKEN_KEY = "dcbest_admin_token";
  const SESSION_KEY = "dcbest_admin_session";
  const SESSION_MS = 8 * 60 * 60 * 1000;
  const TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const page = document.body.dataset.page || "home";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let data = window.SITE_DATA || { v: 1, updatedAt: 0, auth: null, settings: {}, content: {}, lists: {} };
  let editing = false;
  let snapshot = null;

  // ---------- 유틸 ----------
  const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const fromHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const pbkdf2 = async (password, saltHex, iter) => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations: iter }, key, 256);
    return toHex(bits);
  };
  // 토큰 암호화: 비밀번호에서 AES 키를 만들어 토큰을 잠그고(seal) 풉니다(open). 잠긴 토큰은 site.json에 저장됩니다.
  const aesKey = async (password, saltHex) => {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations: 150000 }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  };
  const sealToken = async (token, password) => {
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await aesKey(password, salt);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
    return { salt, iv: toHex(iv.buffer), data: toHex(ct) };
  };
  const openToken = async (sealed, password) => {
    try {
      const key = await aesKey(password, sealed.salt);
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromHex(sealed.iv) }, key, fromHex(sealed.data));
      return new TextDecoder().decode(pt);
    } catch (e) { return ""; }
  };
  const strongEnough = (pw) => pw.length >= 12 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  const b64utf8 = (s) => btoa(unescape(encodeURIComponent(s)));
  const utf8b64 = (s) => decodeURIComponent(escape(atob(s.replace(/\n/g, ""))));
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } };
  const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} };
  const sessionOk = () => { try { return Number(sessionStorage.getItem(SESSION_KEY) || 0) > Date.now(); } catch (e) { return false; } };
  const startSession = () => { try { sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_MS)); } catch (e) {} };
  const endSession = () => { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} };

  // 저장용 HTML 정리: 관리자 UI 요소·편집 속성 제거
  const cleanHtml = (el) => {
    const c = el.cloneNode(true);
    $$(".adm-ctl, .adm-ctl *", c).forEach((n) => n.remove());
    [c, ...$$("[contenteditable],[spellcheck]", c)].forEach((n) => { n.removeAttribute("contenteditable"); n.removeAttribute("spellcheck"); });
    $$("td,th", c).forEach((n) => { if (n.style.position === "relative") { n.style.position = ""; if (!n.getAttribute("style")) n.removeAttribute("style"); } });
    return c;
  };

  // ---------- GitHub API ----------
  const gh = async (method, path, body) => {
    const token = getToken();
    const res = await fetch(API + path + (method === "GET" ? `?ref=${BRANCH}&t=${Date.now()}` : ""), {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 401 || res.status === 403) throw new Error("GitHub 토큰이 잘못되었거나 권한이 없습니다. 토큰을 다시 등록해 주세요.");
    if (!res.ok && res.status !== 404) throw new Error(`GitHub 오류 (${res.status})`);
    return res.status === 404 ? null : res.json();
  };
  const readData = async () => {
    const f = await gh("GET", DATA_PATH);
    if (!f) return { json: { v: 1, updatedAt: 0, auth: data.auth, settings: {}, content: {}, lists: {} }, sha: undefined };
    return { json: JSON.parse(utf8b64(f.content)), sha: f.sha };
  };
  const writeData = async (json, sha, message) => {
    json.updatedAt = Date.now();
    const body = { message, content: b64utf8(JSON.stringify(json, null, 2)), branch: BRANCH };
    if (sha) body.sha = sha;
    await gh("PUT", DATA_PATH, body);
    data = json;
    try { localStorage.setItem("dcbest_site_data", JSON.stringify(json)); } catch (e) {}
  };
  const writeFile = async (path, base64, message) => {
    const existing = await gh("GET", path);
    const body = { message, content: base64, branch: BRANCH };
    if (existing && existing.sha) body.sha = existing.sha;
    await gh("PUT", path, body);
  };

  // ---------- UI 뼈대 ----------
  const style = document.createElement("style");
  style.textContent = `
    .adm-link{font-size:12px;color:#6B7A94;cursor:pointer;background:none;border:0;padding:0;font:inherit}
    .adm-link:hover{color:#fff}
    body.is-admin [data-edit]{outline:1px dashed rgba(185,98,26,.55);outline-offset:2px;cursor:text;min-height:1em}
    body.is-admin [data-edit]:focus{outline:2px solid #F0A64A;background:rgba(240,166,74,.08)}
    body.is-admin [data-list]{outline:1px dotted rgba(18,40,75,.35);outline-offset:6px;position:relative}
    body.is-admin [data-list] > *{position:relative}
    body.is-admin a[data-edit], body.is-admin [data-edit] a{cursor:text}
    .adm-ctl{position:absolute;top:-10px;right:-6px;display:flex;gap:4px;z-index:5}
    .adm-ctl button{width:22px;height:22px;border-radius:50%;border:1px solid #C9D1DC;background:#fff;color:#12284B;font-size:13px;line-height:1;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.12);padding:0}
    .adm-ctl button:hover{background:#12284B;color:#fff}
    .adm-ctl button.del:hover{background:#B42318;border-color:#B42318}
    tr .adm-ctl{top:2px;right:2px}
    .adm-bar{position:fixed;left:0;right:0;bottom:0;z-index:100;background:#12284B;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;box-shadow:0 -8px 24px rgba(0,0,0,.2);font-family:inherit}
    .adm-bar b{font-size:13px;color:#F4B36A;margin-right:auto}
    .adm-bar button{height:36px;padding:0 14px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
    .adm-bar button.primary{background:#F0A64A;color:#12284B;border-color:#F0A64A}
    .adm-bar button:disabled{opacity:.5;cursor:default}
    .adm-bar .adm-status{font-size:12px;color:#C5CFDF;width:100%}
    body.is-admin{padding-bottom:70px}
    .adm-modal{position:fixed;inset:0;z-index:200;background:rgba(13,30,56,.55);display:flex;align-items:center;justify-content:center;padding:16px}
    .adm-box{background:#fff;color:#1B2330;border-radius:14px;padding:26px;width:min(560px,100%);max-height:92vh;overflow:auto;box-shadow:0 24px 60px rgba(0,0,0,.3);font-family:inherit}
    .adm-box h3{margin:0 0 6px;font-size:19px;font-weight:900;color:#12284B}
    .adm-box p{margin:0 0 14px;font-size:13.5px;color:#4A5566;line-height:1.6}
    .adm-box label{display:block;font-size:13px;font-weight:700;color:#12284B;margin:12px 0 4px}
    .adm-box input,.adm-box textarea{width:100%;box-sizing:border-box;min-height:42px;padding:8px 12px;border:1px solid #C9D1DC;border-radius:8px;font:inherit;font-size:14px}
    .adm-box textarea{min-height:70px;resize:vertical}
    .adm-box .row{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
    .adm-box .row button{height:40px;padding:0 16px;border-radius:8px;border:1px solid #C9D1DC;background:#fff;color:#12284B;font:inherit;font-weight:700;cursor:pointer}
    .adm-box .row button.primary{background:#12284B;color:#fff;border-color:#12284B}
    .adm-box .err{color:#B42318;font-size:13px;margin-top:8px;min-height:1em}
    .adm-box .hint{font-size:12px;color:#64708A;margin-top:4px}
    .adm-box details{margin-top:10px;font-size:13px}
    .adm-box summary{cursor:pointer;font-weight:700;color:#12284B}
    .adm-box ol{padding-left:18px;color:#4A5566;line-height:1.7}
  `;
  document.head.appendChild(style);

  const modal = (html) => {
    const wrap = document.createElement("div");
    wrap.className = "adm-modal";
    wrap.innerHTML = `<div class="adm-box">${html}</div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) wrap.remove(); });
    return wrap;
  };

  // ---------- 로그인 ----------
  const loginModal = () => {
    const needToken = !getToken() && !(data.auth && data.auth.sealed);
    const m = modal(`
      <h3>관리자 로그인</h3>
      <p>이 화면에서 바로 문구를 고치고 저장하면 사이트에 반영됩니다.</p>
      <label>비밀번호</label><input type="password" id="admPw" autocomplete="current-password">
      ${needToken ? `
      <label>GitHub 토큰 <span style="font-weight:400;color:#64708A">(처음 한 번만. 비밀번호로 암호화해 보관합니다)</span></label>
      <input type="password" id="admToken" placeholder="github_pat_…">
      <details><summary>토큰 만드는 방법</summary>
        <ol>
          <li>GitHub에 dcbesteng 계정으로 로그인한 뒤 <a href="${TOKEN_URL}" target="_blank" rel="noopener">토큰 만들기 페이지</a>를 엽니다.</li>
          <li>Token name: <b>daechibest-admin</b>, Expiration: 1년 등으로 설정</li>
          <li>Repository access: <b>Only select repositories → daechibest</b></li>
          <li>Permissions → Repository permissions → <b>Contents: Read and write</b></li>
          <li>Generate token → 표시된 토큰을 복사해 위 칸에 붙여넣기</li>
        </ol>
      </details>` : ""}
      <div class="err" id="admErr"></div>
      <div class="row"><button type="button" id="admCancel">취소</button><button type="button" class="primary" id="admGo">로그인</button></div>
    `);
    const pw = $("#admPw", m); pw.focus();
    const go = async () => {
      const err = $("#admErr", m);
      err.textContent = "";
      try {
        if (!data.auth) throw new Error("관리자 설정이 없습니다. data/site.json을 확인해 주세요.");
        const h = await pbkdf2(pw.value, data.auth.salt, data.auth.iter);
        if (h !== data.auth.hash) throw new Error("비밀번호가 맞지 않습니다.");
        let justEntered = false;
        if (needToken) {
          const t = $("#admToken", m).value.trim();
          if (!t) throw new Error("GitHub 토큰을 입력해 주세요.");
          setToken(t);
          try { await gh("GET", DATA_PATH); } catch (e) { setToken(""); throw e; }
          justEntered = true;
        } else if (!getToken() && data.auth.sealed) {
          // 다른 기기: 사이트에 보관된 암호화 토큰을 비밀번호로 풉니다
          const t = await openToken(data.auth.sealed, pw.value);
          if (!t) throw new Error("보관된 토큰을 풀 수 없습니다. 토큰을 다시 등록해 주세요(비밀번호 변경 → 토큰 다시 등록).");
          setToken(t);
        }
        startSession();
        m.remove();
        enterEdit();
        if (data.auth.mustChange || !strongEnough(pw.value)) {
          // 초기·약한 비밀번호: 강한 비밀번호로 바꾸게 하고, 그때 토큰을 암호화해 보관
          setTimeout(() => passwordModal("처음 로그인입니다. 안전한 비밀번호(12자 이상, 영문·숫자·기호)로 바꿔 주세요. 바꾸면 토큰이 암호화되어 어느 기기에서든 비밀번호만으로 편집할 수 있습니다.", pw.value), 300);
        } else if (justEntered || !data.auth.sealed) {
          // 강한 비밀번호 + 새 토큰: 바로 암호화해 보관
          try {
            const { json, sha } = await readData();
            json.auth = Object.assign({}, json.auth || data.auth, { sealed: await sealToken(getToken(), pw.value) });
            delete json.auth.mustChange;
            await writeData(json, sha, "관리자: 토큰 보관");
            status("토큰을 암호화해 보관했습니다. 이제 어느 기기에서든 비밀번호만으로 편집할 수 있습니다.");
          } catch (e) { status("토큰 보관 실패: " + e.message, true); }
        }
      } catch (e) { err.textContent = e.message; }
    };
    $("#admGo", m).addEventListener("click", go);
    $("#admCancel", m).addEventListener("click", () => m.remove());
    m.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  };

  // ---------- 편집 모드 ----------
  const addListControls = () => {
    $$("[data-list]").forEach((list) => {
      [...list.children].forEach((item) => attachCtl(item));
    });
  };
  const attachCtl = (item) => {
    if ($(":scope > .adm-ctl", item)) return;
    const ctl = document.createElement("div");
    ctl.className = "adm-ctl";
    ctl.contentEditable = "false";
    ctl.innerHTML = `<button type="button" class="add" title="아래에 하나 추가">＋</button><button type="button" class="del" title="삭제">✕</button>`;
    ctl.querySelector(".add").addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const clone = cleanHtml(item);
      item.after(clone);
      makeEditable(clone);
      attachCtl(clone);
    });
    ctl.querySelector(".del").addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const list = item.parentElement;
      if (list.children.length <= 1) { alert("마지막 항목은 삭제할 수 없습니다. 내용을 고쳐서 쓰세요."); return; }
      if (confirm("이 항목을 삭제할까요?")) item.remove();
    });
    if (item.tagName === "TR") {
      const td = item.lastElementChild; if (td) { td.style.position = "relative"; td.appendChild(ctl); }
    } else if (item.tagName === "DETAILS") {
      const sm = item.querySelector("summary"); (sm || item).appendChild(ctl);
    } else item.appendChild(ctl);
  };
  const BLOCK_TEXT = "h1,h2,h3,h4,p,li,td,th,summary,label";
  const INLINE_TEXT = "span,a,b,small,time,strong,i,em";
  const set = (el) => { el.contentEditable = "true"; el.spellcheck = false; };
  // 목록(data-list) 안의 텍스트 요소를 편집 가능하게: 블록 텍스트 요소는 통째로, 블록 밖에 홀로 선 인라인 요소도
  const editableInList = (scope) => {
    $$(BLOCK_TEXT, scope).forEach((el) => {
      if (el.closest(".adm-ctl") || el.querySelector(BLOCK_TEXT) || !el.textContent.trim()) return;
      set(el);
    });
    $$(INLINE_TEXT, scope).forEach((el) => {
      if (el.closest(".adm-ctl") || !el.textContent.trim()) return;
      if (el.parentElement && (el.parentElement.closest(BLOCK_TEXT) || el.parentElement.closest(INLINE_TEXT))) return;
      if (el.querySelector(BLOCK_TEXT)) return;
      set(el);
    });
  };
  const makeEditable = (root) => {
    if (root.matches("[data-edit]") && !root.closest("[data-list]")) set(root);
    $$("[data-edit]", root).forEach((el) => { if (!el.closest("[data-list]")) set(el); });
    if (root.closest("[data-list]")) editableInList(root);
    $$("[data-list]", root).forEach(editableInList);
  };
  const linkGuard = (e) => {
    if (!editing) return;
    const a = e.target.closest("a");
    if (a && !a.closest(".adm-bar") && !a.closest(".adm-modal") && !a.closest(".adm-ctl")) {
      if (a.closest("header.site-header") || a.closest("footer.site-footer")) return;
      e.preventDefault();
    }
  };
  const linkEdit = (e) => {
    if (!editing) return;
    const a = e.target.closest("a");
    if (!a || a.closest(".adm-bar") || a.closest(".adm-modal") || a.closest("header.site-header") || a.closest("footer.site-footer")) return;
    e.preventDefault();
    const v = prompt("이 링크의 주소를 입력하세요 (예: info.html#edu, https://…)", a.getAttribute("href") || "");
    if (v !== null) a.setAttribute("href", v.trim());
  };

  const enterEdit = () => {
    if (editing) return;
    editing = true;
    snapshot = $("main").innerHTML;
    document.body.classList.add("is-admin");
    makeEditable($("main"));
    addListControls();
    document.addEventListener("click", linkGuard, true);
    document.addEventListener("dblclick", linkEdit, true);
    const bar = document.createElement("div");
    bar.className = "adm-bar";
    bar.innerHTML = `
      <b>관리자 편집 중 · ${esc(document.title.split(" — ")[0])}</b>
      <button type="button" id="admSettings">설정 (연락처·공지·로고)</button>
      <button type="button" id="admPass">비밀번호 변경</button>
      <button type="button" id="admReset">되돌리기</button>
      <button type="button" id="admLogout">로그아웃</button>
      <button type="button" class="primary" id="admSave">저장하기</button>
      <div class="adm-status" id="admStatus">문구를 클릭해 바로 고치세요. 링크 주소는 더블클릭, 목록 항목은 ＋ / ✕ 버튼. 저장하면 1~2분 뒤 사이트에 반영됩니다.</div>`;
    document.body.appendChild(bar);
    $("#admSave").addEventListener("click", save);
    $("#admReset").addEventListener("click", () => { if (confirm("이 페이지에서 고친 내용을 모두 되돌릴까요? (저장 전 상태)")) location.reload(); });
    $("#admLogout").addEventListener("click", () => { endSession(); location.reload(); });
    $("#admSettings").addEventListener("click", settingsModal);
    $("#admPass").addEventListener("click", passwordModal);
    window.addEventListener("beforeunload", (e) => { if (editing && $("main").innerHTML !== snapshot) { e.preventDefault(); e.returnValue = ""; } });
    // 초기 비밀번호를 아직 바꾸지 않았으면(이미 로그인된 상태로 들어온 경우 포함) 변경 창을 띄웁니다
    if (data.auth && data.auth.mustChange && !$(".adm-modal")) setTimeout(() => { if (!$(".adm-modal")) passwordModal("아직 초기 비밀번호를 쓰고 있습니다. 안전한 비밀번호로 바꿔 주세요. 바꾸면 토큰이 암호화되어 어느 기기에서든 비밀번호만으로 편집할 수 있습니다."); }, 400);
  };

  const status = (msg, isErr) => { const s = $("#admStatus"); if (s) { s.textContent = msg; s.style.color = isErr ? "#FFB4A8" : "#C5CFDF"; } };

  // ---------- 저장 ----------
  const collect = () => {
    const content = {}, lists = {};
    $$("[data-edit]").forEach((el) => {
      if (el.closest("[data-list]")) return;
      content[el.dataset.edit] = cleanHtml(el).innerHTML.trim();
    });
    $$("[data-list]").forEach((list) => {
      lists[list.dataset.list] = [...list.children].filter((c) => !c.classList.contains("adm-ctl")).map((c) => cleanHtml(c).outerHTML);
    });
    return { content, lists };
  };
  const save = async () => {
    const btn = $("#admSave"); btn.disabled = true; status("저장 중…");
    try {
      const { content, lists } = collect();
      const { json, sha } = await readData();
      json.auth = json.auth || data.auth;
      json.settings = json.settings || {}; json.content = json.content || {}; json.lists = json.lists || {};
      Object.assign(json.content, content);
      Object.assign(json.lists, lists);
      await writeData(json, sha, `관리자 수정: ${page} 페이지`);
      snapshot = $("main").innerHTML;
      status("저장했습니다. GitHub에 반영됐고 1~2분 뒤 사이트에 적용됩니다. (이 브라우저에는 바로 적용)");
    } catch (e) { status("저장 실패: " + e.message, true); }
    btn.disabled = false;
  };

  // ---------- 설정 ----------
  const FIELDS = [
    ["name", "학원 이름", "text"], ["phone", "전화번호", "text"], ["address", "주소", "text"], ["hours", "상담 가능 시간", "text"],
    ["notice", "상단 띠 공지 (비우면 띠가 사라짐)", "text"],
    ["formEndpoint", "신청 폼 전송 주소 (Formspree 등, 비우면 이메일 방식)", "text"], ["formEmail", "신청 받을 이메일", "text"],
    ["mapEmbedUrl", "지도 퍼가기 주소 (iframe src)", "text"], ["loginUrl", "로그인 링크 (비우면 숨김)", "text"],
    ["registrationNo", "학원 등록번호", "text"], ["owner", "대표", "text"], ["bizNo", "사업자등록번호", "text"]
  ];
  const settingsModal = () => {
    const cur = Object.assign({}, window.SITE_DEFAULTS || window.SITE || {}, data.settings || {});
    const m = modal(`
      <h3>설정</h3>
      <p>모든 페이지에 공통으로 쓰이는 값입니다. 저장하면 바로 반영됩니다.</p>
      ${FIELDS.map(([k, label]) => `<label>${label}</label><input type="text" data-k="${k}" value="${esc(cur[k] || "")}">`).join("")}
      <label>로고 이미지 (PNG/JPG/SVG, 가로세로 같은 비율 권장)</label>
      <input type="file" id="admLogo" accept="image/png,image/jpeg,image/svg+xml">
      <div class="hint">현재: ${esc(cur.logo || "img/logo.svg")}</div>
      <div class="err" id="admSetErr"></div>
      <div class="row"><button type="button" id="admSetCancel">취소</button><button type="button" class="primary" id="admSetSave">설정 저장</button></div>
    `);
    $("#admSetCancel", m).addEventListener("click", () => m.remove());
    $("#admSetSave", m).addEventListener("click", async () => {
      const err = $("#admSetErr", m); err.textContent = ""; $("#admSetSave", m).disabled = true;
      try {
        const settings = {};
        $$("input[data-k]", m).forEach((i) => { settings[i.dataset.k] = i.value.trim(); });
        const file = $("#admLogo", m).files[0];
        const { json, sha } = await readData();
        json.auth = json.auth || data.auth; json.settings = json.settings || {};
        if (file) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (!["png", "jpg", "jpeg", "svg"].includes(ext)) throw new Error("PNG, JPG, SVG 파일만 올릴 수 있습니다.");
          const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
          const path = `img/logo-upload.${ext === "jpeg" ? "jpg" : ext}`;
          await writeFile(path, base64, "관리자: 로고 변경");
          settings.logo = `${path}?v=${Date.now()}`;
        } else if (json.settings.logo) settings.logo = json.settings.logo;
        Object.assign(json.settings, settings);
        await writeData(json, sha, "관리자: 설정 변경");
        m.remove();
        status("설정을 저장했습니다. 새로고침하면 반영된 모습을 볼 수 있습니다.");
      } catch (e) { err.textContent = e.message; $("#admSetSave", m).disabled = false; }
    });
  };

  // ---------- 비밀번호 변경 ----------
  const passwordModal = (intro, oldPrefill) => {
    const m = modal(`
      <h3>비밀번호 변경</h3>
      <p>${esc(intro || "관리자 비밀번호를 바꿉니다.")} <b>12자 이상, 영문·숫자·기호</b>를 섞어 주세요. 바꾸면 보관된 토큰도 새 비밀번호로 다시 암호화됩니다.</p>
      <label>현재 비밀번호</label><input type="password" id="pwOld" value="${esc(oldPrefill || "")}">
      <label>새 비밀번호</label><input type="password" id="pwNew">
      <label>새 비밀번호 확인</label><input type="password" id="pwNew2">
      <details><summary>GitHub 토큰 다시 등록</summary><label>새 토큰</label><input type="password" id="pwToken" placeholder="비워 두면 기존 토큰 유지"><div class="hint">토큰만 바꿀 때는 현재 비밀번호만 입력하고 새 비밀번호 칸은 비워 두세요.</div></details>
      <div class="err" id="pwErr"></div>
      <div class="row"><button type="button" id="pwCancel">취소</button><button type="button" class="primary" id="pwSave">변경</button></div>
    `);
    $("#pwCancel", m).addEventListener("click", () => m.remove());
    $("#pwSave", m).addEventListener("click", async () => {
      const err = $("#pwErr", m); err.textContent = "";
      try {
        const old = $("#pwOld", m).value, nw = $("#pwNew", m).value, nw2 = $("#pwNew2", m).value, tk = $("#pwToken", m).value.trim();
        if (tk) setToken(tk);
        if (nw || nw2) {
          if ((await pbkdf2(old, data.auth.salt, data.auth.iter)) !== data.auth.hash) throw new Error("현재 비밀번호가 맞지 않습니다.");
          if (!strongEnough(nw)) throw new Error("새 비밀번호는 12자 이상이고 영문·숫자·기호를 모두 포함해야 합니다.");
          if (nw !== nw2) throw new Error("새 비밀번호가 서로 다릅니다.");
          const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
          const iter = 100000;
          const hash = await pbkdf2(nw, salt, iter);
          const { json, sha } = await readData();
          json.auth = { salt, iter, hash, sealed: await sealToken(getToken(), nw) };
          await writeData(json, sha, "관리자: 비밀번호 변경");
        } else if (tk) {
          // 토큰만 다시 등록: 현재 비밀번호로 암호화해 보관
          if ((await pbkdf2(old, data.auth.salt, data.auth.iter)) !== data.auth.hash) throw new Error("현재 비밀번호가 맞지 않습니다.");
          const { json, sha } = await readData();
          json.auth = Object.assign({}, json.auth || data.auth, { sealed: await sealToken(tk, old) });
          delete json.auth.mustChange;
          await writeData(json, sha, "관리자: 토큰 다시 등록");
        }
        m.remove();
        status(nw ? "비밀번호를 변경하고 토큰을 암호화해 보관했습니다. 이제 어느 기기에서든 비밀번호만으로 편집할 수 있습니다." : "토큰을 등록했습니다.");
      } catch (e) { err.textContent = e.message; }
    });
  };

  // ---------- 진입점 (site.js가 푸터 '관리자' 버튼 클릭 시 이 파일을 불러옵니다) ----------
  window.__openAdmin = () => (sessionOk() ? enterEdit() : loginModal());
  if (window.__ADMIN_OPEN) window.__openAdmin();
})();

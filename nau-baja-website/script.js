/* =====================================================================
   script.js —— 网站的"行为"
   ---------------------------------------------------------------------
   JavaScript 基本概念（看代码时对照）：
     const x = 5;          声明一个不会被重新赋值的变量
     let y = 0;            声明一个之后可以改的变量
     function f(a) {...}   定义函数
     (a) => {...}          箭头函数，函数的简写
     document.querySelector(".hero")     找到页面上第一个 class="hero" 的元素
     document.querySelectorAll(".node")  找到所有 class="node" 的元素
     el.addEventListener("click", f)     当 el 被点击时，运行函数 f
     el.classList.add("x") / .remove("x") / .toggle("x", 条件)   增删 class
     el.textContent = "..."              修改元素里的文字

   整体思路：JS 不直接改颜色，而是"加/删 class"，具体长什么样交给 CSS。
   这样分工清楚：JS 管逻辑，CSS 管外观。
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. 手机菜单的开/关
   --------------------------------------------------------------------- */
const menuBtn = document.querySelector("#menuBtn");
const siteNav = document.querySelector("#siteNav");

menuBtn.addEventListener("click", () => {
  // toggle 返回切换后的状态：true = 现在是打开的
  const isOpen = siteNav.classList.toggle("is-open");
  menuBtn.setAttribute("aria-expanded", String(isOpen));
});

// 点了菜单里的某个链接后，自动收起菜单
siteNav.addEventListener("click", (event) => {
  if (event.target.tagName === "A") {
    siteNav.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
  }
});


/* ---------------------------------------------------------------------
   2. 滚动时高亮当前所在的导航链接
   IntersectionObserver：浏览器提供的"观察员"，
   当某个元素进入/离开屏幕可见区域时通知我们。
   --------------------------------------------------------------------- */
const navLinks = document.querySelectorAll(".site-nav a");
const sections = document.querySelectorAll("main section[id]");

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;   // 不在屏幕里，跳过
    const id = entry.target.id;
    navLinks.forEach((link) => {
      // 链接的 href 是 "#id" 的那个加上 is-active，其他的去掉
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
    });
  });
}, {
  // rootMargin 把"判定区域"缩成屏幕中间偏上的一条带，比较符合阅读位置
  rootMargin: "-40% 0px -55% 0px"
});

sections.forEach((section) => sectionObserver.observe(section));


/* ---------------------------------------------------------------------
   3. 交互式系统图（核心部分）

   【状态 state】一个对象，记住三个开关现在是开还是关。
   【规则】
     - 发动机运转 = 两个熄火开关都没按下
     - 刹车灯亮   = 踩了刹车（和熄火开关无关！这正是 SAE 规则要求的）
   【渲染 render】根据 state，更新导线、读数、文字。
   每次按开关：改 state → 调用 render()。这是写交互页面最常用的模式。
   --------------------------------------------------------------------- */
const IDLE_RPM = 1800;   // 模拟的怠速转速

const state = {
  brake: false,
  driverKill: false,
  externalKill: false
};

// 三个开关按钮，和它们控制的 state 字段一一对应
const toggles = [
  { el: document.querySelector("#tBrake"),    key: "brake" },
  { el: document.querySelector("#tDriver"),   key: "driverKill" },
  { el: document.querySelector("#tExternal"), key: "externalKill" }
];

toggles.forEach(({ el, key }) => {
  el.addEventListener("click", () => {
    state[key] = !state[key];                        // 取反：开变关，关变开
    el.setAttribute("aria-pressed", String(state[key]));
    render();
  });
});

// 读数区的元素
const rEngine = document.querySelector("#rEngine");
const rRpm    = document.querySelector("#rRpm");
const rBrake  = document.querySelector("#rBrake");
const rNote   = document.querySelector("#rNote");

// 所有带 data-when 的元素（导线 + 刹车灯）
const liveParts = document.querySelectorAll("[data-when]");
const engineNode = document.querySelector(".node-engine");

function render() {
  const killAny = state.driverKill || state.externalKill;   // || 表示"或"
  const engineRunning = !killAny;                             // ! 表示"非"

  // 每种 data-when 条件现在是否成立
  const conditions = {
    "always": true,
    "brake": state.brake,
    "engine": engineRunning,
    "kill-any": killAny,
    "kill-driver": state.driverKill,
    "kill-external": state.externalKill
  };

  // 遍历每根导线：条件成立就加 is-live，不成立就去掉
  liveParts.forEach((part) => {
    const when = part.dataset.when;   // dataset.when 读取的就是 HTML 里的 data-when
    part.classList.toggle("is-live", conditions[when]);
  });
  engineNode.classList.toggle("is-killed", killAny);

  // 更新读数
  rEngine.textContent = engineRunning ? "RUNNING" : "STOPPED";
  // 上面是"三元运算符"：条件 ? 成立时的值 : 不成立时的值
  rEngine.className = engineRunning ? "is-on" : "is-kill";

  rBrake.textContent = state.brake ? "ON" : "OFF";
  rBrake.className = state.brake ? "is-kill" : "";

  rRpm.textContent = engineRunning ? IDLE_RPM.toLocaleString("en-US") : "0";

  // 根据组合情况给出一句说明
  if (killAny && state.brake) {
    rNote.textContent = "Engine killed, brake light still on. This is the behavior the rules require.";
  } else if (killAny) {
    rNote.textContent = "Ignition grounded through the kill switch. Press the brake to check the light.";
  } else if (state.brake) {
    rNote.textContent = "Pressure switch closed, relay energized, brake light on.";
  } else {
    rNote.textContent = "Simulated values for illustration.";
  }
}

// 让 RPM 在怠速附近小幅跳动，看起来像真实仪表
// setInterval(函数, 毫秒)：每隔一段时间运行一次
setInterval(() => {
  const engineRunning = !(state.driverKill || state.externalKill);
  if (!engineRunning) return;
  const jitter = Math.round((Math.random() - 0.5) * 60);   // -30 到 +30 之间的随机数
  rRpm.textContent = (IDLE_RPM + jitter).toLocaleString("en-US");  // 加千位逗号：1,812
}, 600);

render();   // 页面加载时先渲染一次


/* ---------------------------------------------------------------------
   4. 点击元件 → 显示详细介绍
   把所有介绍文字放在一个对象里（"数据"），点击时按名字取出来填进页面。
   这样以后要改文字，只改这里，不用动 HTML。
   --------------------------------------------------------------------- */
const PARTS = {
  battery: {
    tag: "Power source",
    name: "12 V sealed lead-acid AGM battery",
    text: "Chosen after reviewing the Baja SAE rules: sealed, spill-proof and vibration-tolerant. It powers the whole main harness through the 25 A primary fuse. The specific model is still being selected."
  },
  fuse: {
    tag: "W01 → W02 · Protection",
    name: "25 A primary fuse",
    text: "Sits right after the battery so a short anywhere downstream opens the circuit before wires overheat. Every power circuit on the vehicle is protected, as the rules require."
  },
  fusebox: {
    tag: "P01 · Power distribution",
    name: "Fuse distribution box",
    text: "Splits battery power into three separately fused circuits: P01-1 feeds the brake pressure switches, P01-2 feeds the relay and brake light, and P01-3 feeds the digital display. A fourth position is left free for future additions such as data logging."
  },
  switches: {
    tag: "P01-1 · Brake signal",
    name: "Hydraulic brake pressure switches (SW-1, SW-2)",
    text: "Two pressure switches are wired in parallel on the hydraulic brake lines. When the driver presses the footbrake, line pressure closes a switch and sends 12 V to the relay coil. Either switch alone is enough to light the lamp."
  },
  relay: {
    tag: "R1 · Switching",
    name: "Normally open automotive relay",
    text: "The small current from the pressure switches energizes the coil (C3–C4). The coil pulls the contacts (C1–C2) closed, which connects P01-2 power to the brake light. The switches never carry the lamp's full current."
  },
  brakelight: {
    tag: "W07 · Output",
    name: "Brake light",
    text: "Lights whenever brake pressure is detected. It is on a circuit that the engine kill switches never touch, so it keeps working after the engine is shut off."
  },
  buck: {
    tag: "P01-3 · Regulation",
    name: "DC-DC buck converters",
    text: "Two step-down converters bring the 12 V battery down to the 5 V the dashboard electronics need: a Pololu D24V50F5 regulator for the parallel power rail and a USB-C buck converter for the Raspberry Pi."
  },
  esp32: {
    tag: "Dashboard · Processing",
    name: "ESP32-S3 microcontroller",
    text: "Counts the pulses from the two Hall-effect sensors and turns pulse frequency into vehicle speed and engine RPM. Results go to the Raspberry Pi over UART."
  },
  pi: {
    tag: "Dashboard · Display logic",
    name: "Raspberry Pi 5",
    text: "Receives speed and RPM from the ESP32-S3 and handles the information sent to the screen. It also gives room to grow into data logging later."
  },
  hall: {
    tag: "Dashboard · Sensing",
    name: "Hall-effect sensors (wheel and engine)",
    text: "Allegro A110x-family switches output a pulse each time a magnet or tooth passes. One watches a wheel for speed and one watches the engine for RPM. Pull-up resistors to 3.3 V give the ESP32-S3 a clean logic signal."
  },
  nextion: {
    tag: "Dashboard · Output",
    name: "Nextion NX4832K035 display",
    text: "A 3.5 inch HMI touch display that shows vehicle speed and engine RPM to the driver. A first draft of the screen layout is done."
  },
  ignition: {
    tag: "Kill circuit · Engine",
    name: "Kohler CH440 ignition",
    text: "The engine stops when its ignition kill lead is connected to ground. Both kill switches act on this one lead, and nothing in the main harness is connected to it."
  },
  driverKill: {
    tag: "Kill circuit · Cockpit",
    name: "Driver kill switch (Polaris)",
    text: "Mounted inside the cockpit within easy reach of the driver. Closing it grounds the ignition and stops the engine."
  },
  externalKill: {
    tag: "Kill circuit · Exterior",
    name: "External kill switch (Polaris)",
    text: "Mounted on the rear exterior of the chassis so track personnel can shut the engine off. Wired in parallel with the driver switch, so either one works on its own."
  }
};

const nodes  = document.querySelectorAll(".node");
const pdTag  = document.querySelector("#pdTag");
const pdName = document.querySelector("#pdName");
const pdText = document.querySelector("#pdText");

function selectPart(node) {
  const info = PARTS[node.dataset.part];
  if (!info) return;
  nodes.forEach((n) => n.classList.remove("is-selected"));   // 先取消所有选中
  node.classList.add("is-selected");                          // 再选中当前这个
  pdTag.textContent  = info.tag;
  pdName.textContent = info.name;
  pdText.textContent = info.text;
}

nodes.forEach((node) => {
  node.addEventListener("click", () => selectPart(node));
  // 键盘支持：选中元件后按 Enter 或空格也能触发
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();   // 阻止空格键默认的"页面往下滚"
      selectPart(node);
    }
  });
});

// 默认选中保险丝分配盒
selectPart(document.querySelector('[data-part="fusebox"]'));


/* ---------------------------------------------------------------------
   5. 原理图弹窗（lightbox）
   --------------------------------------------------------------------- */
const lightbox        = document.querySelector("#lightbox");
const lightboxImg     = document.querySelector("#lightboxImg");
const lightboxCaption = document.querySelector("#lightboxCaption");

document.querySelectorAll(".fig-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    lightboxImg.src = btn.dataset.full;
    lightboxImg.alt = btn.querySelector("img").alt;
    lightboxCaption.textContent = btn.dataset.caption;
    lightbox.showModal();   // <dialog> 自带的方法：以弹窗形式打开（按 Esc 自动关闭）
  });
});

document.querySelector("#lightboxClose").addEventListener("click", () => lightbox.close());

// 点击弹窗外面的黑色遮罩也关闭
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});


/* ---------------------------------------------------------------------
   6. 时间线：根据"今天"自动标记 已完成 / 下一个 / 之后
   --------------------------------------------------------------------- */
const timeline = document.querySelector("#timeline");
const items = Array.from(timeline.querySelectorAll("li"));   // 转成数组，才能用 findIndex

// 只比较"日期"，把今天的时间设成 0 点
const today = new Date();
today.setHours(0, 0, 0, 0);

// 找出第一个"日期 ≥ 今天"的节点，它就是"下一个"
const nextIndex = items.findIndex((li) => {
  const due = new Date(li.dataset.date + "T00:00:00");
  return due >= today;
});

items.forEach((li, i) => {
  if (nextIndex === -1 || i < nextIndex) li.classList.add("is-done");   // -1 表示全部都过了
  else if (i === nextIndex) li.classList.add("is-next");
});

// 金色进度线画到"下一个"节点的位置
const doneCount = nextIndex === -1 ? items.length : nextIndex;
const progress = Math.min(100, (doneCount / items.length) * 100);
timeline.style.setProperty("--progress", progress + "%");   // 给 CSS 变量赋值

// 在标题下方加一句"距离下一个截止还有几天"
if (nextIndex !== -1) {
  const next = items[nextIndex];
  const due = new Date(next.dataset.date + "T00:00:00");
  const days = Math.round((due - today) / 86400000);   // 两个日期相减得到毫秒；一天 = 86,400,000 毫秒
  const label = next.querySelector("span").textContent;
  const when = days === 0 ? "due today" : days === 1 ? "due tomorrow" : `due in ${days} days`;
  // 反引号 ` ` 是"模板字符串"，${变量} 可以把变量直接嵌进文字里
  document.querySelector("#scheduleSummary").textContent =
    `Next up: ${label}, ${when}. This semester covers design, calculations, the parts list and test plans; assembly and testing follow in spring.`;
}

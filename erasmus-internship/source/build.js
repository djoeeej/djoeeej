// Builds the redesigned Erasmus+ internship deck.
// Shapes that should animate get objectName "A<step>_<effect>"; animate.py
// turns those names into PowerPoint entrance animations after the build.
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const Lu = require("react-icons/lu");

const W = 13.333, H = 7.5, M = 0.6;
const C = {
  navy: "0E1E4A", navy2: "182C63", teal: "1695B9", tealLt: "5CC6E6",
  purple: "7A49C7", ink: "15203F", muted: "5A6682", light: "F3F5FA",
  white: "FFFFFF", line: "DDE3EF", tealTint: "E6F4F9", purpleTint: "F0EAFA",
  word: "2B579A", excel: "217346", erasmus: "003399",
};
const HEAD = "Cambria", BODY = "Calibri";
const TOTAL = 12;

const shadow = () => ({ type: "outer", blur: 10, offset: 3, angle: 90, color: "1B2A55", opacity: 0.12 });
const nm = (step, fx) => `A${String(step).padStart(2, "0")}_${fx}`;

async function iconBadge(Icon, circle, fg = "#FFFFFF", px = 256) {
  const inner = ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { size: px * 0.5, color: fg }))
    .replace("<svg ", `<svg x="${px * 0.25}" y="${px * 0.25}" `);
  const bg = circle ? `<circle cx="${px / 2}" cy="${px / 2}" r="${px / 2}" fill="#${circle}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}">${bg}${inner}</svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

function text(slide, str, opts) {
  slide.addText(str, { fontFace: BODY, color: C.ink, margin: 0, isTextBox: true, ...opts });
}

function header(slide, eyebrow, title, { dark = false, step = 0, accent = C.teal } = {}) {
  text(slide, eyebrow, {
    x: M, y: 0.45, w: 9, h: 0.3, fontSize: 12, bold: true, charSpacing: 4,
    color: dark ? C.tealLt : accent, objectName: nm(step, "fade"),
  });
  text(slide, title, {
    x: M, y: 0.75, w: W - 2 * M, h: 0.8, fontFace: HEAD, fontSize: 36, bold: true,
    color: dark ? C.white : C.ink, valign: "middle", objectName: nm(step, "float"),
  });
}

function footer(slide, n, dark = false, logoPill = dark) {
  if (logoPill) {
    slide.addShape("roundRect", { x: M - 0.08, y: 6.93, w: 0.86, h: 0.38, fill: { color: C.white }, rectRadius: 0.08, line: { type: "none" } });
  }
  slide.addImage({ path: "img/kvk.png", x: M, y: 6.98, w: 0.68, h: 0.28, altText: "KVK logo" });
  text(slide, "Haithem Cheniti  ·  Erasmus+ Internship Defence", {
    x: 3.5, y: 6.98, w: 6.33, h: 0.28, fontSize: 10, align: "center", valign: "middle",
    color: dark ? "AEB9D6" : C.muted,
  });
  text(slide, `${String(n).padStart(2, "0")} / ${TOTAL}`, {
    x: W - M - 1.2, y: 6.98, w: 1.2, h: 0.28, fontSize: 10, bold: true, align: "right", valign: "middle",
    color: dark ? C.tealLt : C.teal,
  });
}

function card(slide, x, y, w, h, step, fx, fill = C.white) {
  slide.addShape("roundRect", {
    x, y, w, h, fill: { color: fill }, rectRadius: 0.12, line: { color: C.line, width: 0.75 },
    shadow: shadow(), objectName: nm(step, fx),
  });
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "Haithem Cheniti";
  pres.title = "My Erasmus+ Internship in France";
  pres.subject = "Erasmus+ internship defence — KHELA, France";

  // ───────────────────────── 1. Title ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.navy };
    s.addImage({ path: "img/bordeaux_tall.jpg", x: 6.6, y: 0, w: 6.733, h: 7.5, altText: "Evening view of a French city square reflected in water", objectName: nm(0, "fade") });
    s.addShape("roundRect", { x: 0.7, y: 0.6, w: 1.5, h: 0.55, fill: { color: C.white }, rectRadius: 0.1, line: { type: "none" }, objectName: nm(1, "fade") });
    s.addImage({ path: "img/kvk.png", x: 0.97, y: 0.68, w: 0.95, h: 0.39, altText: "KVK logo", objectName: nm(1, "fade") });
    text(s, "ERASMUS+ INTERNSHIP DEFENCE", { x: 0.7, y: 2.1, w: 5.6, h: 0.35, fontSize: 13, bold: true, charSpacing: 5, color: C.tealLt, objectName: nm(2, "float") });
    text(s, "My Erasmus+ Internship in France", { x: 0.7, y: 2.55, w: 5.7, h: 1.55, fontFace: HEAD, fontSize: 42, bold: true, color: C.white, valign: "top", objectName: nm(3, "float") });
    text(s, "Haithem Cheniti", { x: 0.7, y: 4.35, w: 5.6, h: 0.5, fontSize: 24, bold: true, color: C.white, objectName: nm(4, "float") });
    text(s, [
      { text: "Host company: ", options: { bold: true, color: C.tealLt } },
      { text: "KHELA (Khelaf), France", options: { breakLine: true } },
      { text: "Sending institution: ", options: { bold: true, color: C.tealLt } },
      { text: "Klaipėdos valstybinė kolegija (KVK)" },
    ], { x: 0.7, y: 4.9, w: 5.7, h: 0.75, fontSize: 14, color: "D5DCEE", paraSpaceAfter: 4, objectName: nm(5, "float") });
    s.addText("Erasmus+", { x: 0.7, y: 6.0, w: 1.7, h: 0.55, shape: "roundRect", rectRadius: 0.1, fill: { color: C.white }, fontFace: BODY, fontSize: 17, bold: true, color: C.erasmus, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: nm(6, "zoom") });
    s.addNotes("Good morning. My name is Haithem Cheniti, a student at Klaipėdos valstybinė kolegija. Today I will present my Erasmus+ internship at KHELA in France: the programme, the company, my tasks, the tools I used, the skills I gained, the challenges I faced and what this mobility meant for me.");
  }

  // ───────────────────────── 2. Agenda ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.light };
    s.addShape("rect", { x: 0, y: 0, w: 4.4, h: H, fill: { color: C.navy }, line: { type: "none" } });
    text(s, "OVERVIEW", { x: M, y: 2.3, w: 3.4, h: 0.3, fontSize: 12, bold: true, charSpacing: 4, color: C.tealLt, objectName: nm(0, "fade") });
    text(s, "Agenda", { x: M, y: 2.65, w: 3.4, h: 1.0, fontFace: HEAD, fontSize: 48, bold: true, color: C.white, objectName: nm(0, "float") });
    text(s, "Six parts, from the programme's goals to what I take away from the experience.", { x: M, y: 3.75, w: 3.2, h: 1.1, fontSize: 15, color: "C9D3EA", valign: "top", objectName: nm(1, "fade") });
    const items = [
      ["Erasmus+ programme", "Why I went and what I wanted to achieve"],
      ["Host company", "Who KHELA is and what it does"],
      ["My role", "Daily tasks and responsibilities"],
      ["Digital tools", "How I used Word, Excel and document management"],
      ["Skills & challenges", "What I learned and how I adapted"],
      ["Personal growth", "The Erasmus experience and key takeaways"],
    ];
    items.forEach(([t, d], i) => {
      const y = 0.75 + i * 0.97, st = 2 + i, col = i % 2 ? C.purple : C.teal;
      s.addText(String(i + 1).padStart(2, "0"), { x: 5.0, y: y + 0.08, w: 0.62, h: 0.62, shape: "ellipse", fill: { color: col }, fontFace: BODY, fontSize: 15, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: nm(st, "float") });
      text(s, t, { x: 5.9, y: y + 0.02, w: 6.8, h: 0.4, fontSize: 20, bold: true, valign: "middle", objectName: nm(st, "float") });
      text(s, d, { x: 5.9, y: y + 0.42, w: 6.8, h: 0.32, fontSize: 14, color: C.muted, valign: "middle", objectName: nm(st, "float") });
    });
    footer(s, 2, false, true);
    s.addNotes("Here is the structure of my presentation. I will start with the Erasmus+ programme and my objectives, then introduce KHELA, describe my role and the digital tools I used, and finish with the skills I developed, the challenges I faced and my personal growth.");
  }

  // ───────────────────────── 3. At a glance ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.light };
    header(s, "KEY FACTS", "Internship at a Glance");
    const tiles = [
      [Lu.LuGraduationCap, C.teal, "PROGRAMME", "Erasmus+ traineeship"],
      [Lu.LuMapPin, C.purple, "DESTINATION", "France"],
      [Lu.LuBuilding2, C.navy, "HOST COMPANY", "KHELA (Khelaf)"],
      [Lu.LuSchool, C.teal, "SENDING INSTITUTION", "KVK — Klaipėda, Lithuania"],
      [Lu.LuBriefcase, C.purple, "POSITION", "Administrative / office intern"],
      [Lu.LuMonitor, C.navy, "MAIN TOOLS", "Microsoft Word & Excel"],
    ];
    const tw = (W - 2 * M - 0.6) / 3, th = 2.05;
    for (let i = 0; i < tiles.length; i++) {
      const [Ic, col, lab, val] = tiles[i];
      const x = M + (i % 3) * (tw + 0.3), y = 1.95 + Math.floor(i / 3) * (th + 0.3), st = 1 + i;
      card(s, x, y, tw, th, st, "zoom");
      s.addImage({ data: await iconBadge(Ic, col), x: x + 0.35, y: y + 0.35, w: 0.72, h: 0.72, altText: lab, objectName: nm(st, "zoom") });
      text(s, lab, { x: x + 0.35, y: y + 1.2, w: tw - 0.7, h: 0.28, fontSize: 11, bold: true, charSpacing: 2, color: C.muted, objectName: nm(st, "zoom") });
      text(s, val, { x: x + 0.35, y: y + 1.48, w: tw - 0.5, h: 0.42, fontSize: 19, bold: true, objectName: nm(st, "zoom") });
    }
    footer(s, 3);
    s.addNotes("Here are the key facts. This was an Erasmus+ traineeship in France. My host company was KHELA, and my sending institution is KVK in Klaipėda, Lithuania. I worked as an administrative intern, and my main tools were Microsoft Word and Excel.");
  }

  // ───────────────────────── 4. Objectives ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.light };
    header(s, "ERASMUS+ PROGRAMME", "Why Erasmus+? My Objectives", { accent: C.purple });
    text(s, "Erasmus+ gives students the chance to gain real work experience abroad, combining professional practice with intercultural learning. My mobility had three objectives:", {
      x: M, y: 1.65, w: 11.2, h: 0.75, fontSize: 16, color: C.muted, valign: "top", objectName: nm(1, "fade"),
    });
    const obj = [
      ["01", C.teal, Lu.LuTarget, "Practical experience", "Apply what I learned at KVK in a real company, with real deadlines and responsibilities."],
      ["02", C.purple, Lu.LuGlobe, "Global exposure", "Live and work in France, inside a multicultural team and a new business culture."],
      ["03", C.navy, Lu.LuTrendingUp, "Career development", "Build the competencies European employers look for: digital, organisational and communication skills."],
    ];
    const cw = (W - 2 * M - 0.6) / 3;
    for (let i = 0; i < 3; i++) {
      const [num, col, Ic, t, d] = obj[i], x = M + i * (cw + 0.3), y = 2.75, st = 2 + i;
      card(s, x, y, cw, 3.45, st, "float");
      text(s, num, { x: x + 0.4, y: y + 0.35, w: 1.5, h: 0.8, fontFace: HEAD, fontSize: 44, bold: true, color: col, objectName: nm(st, "float") });
      s.addImage({ data: await iconBadge(Ic, col), x: x + cw - 1.15, y: y + 0.4, w: 0.75, h: 0.75, altText: t, objectName: nm(st, "float") });
      text(s, t, { x: x + 0.4, y: y + 1.5, w: cw - 0.8, h: 0.45, fontSize: 21, bold: true, objectName: nm(st, "float") });
      text(s, d, { x: x + 0.4, y: y + 2.05, w: cw - 0.8, h: 1.2, fontSize: 16, color: C.muted, valign: "top", objectName: nm(st, "float") });
    }
    footer(s, 4);
    s.addNotes("The Erasmus+ programme supports student traineeships abroad. My mobility had three objectives: first, to gain practical experience by applying what I learned at KVK in a real company; second, to be exposed to an international workplace in France; and third, to develop the competencies that European employers value.");
  }

  // ───────────────────────── 5. Host company ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.light };
    header(s, "HOST COMPANY", "About KHELA");
    text(s, "A medium-sized French company specialised in buying, selling, repairing and refurbishing machines, electronics and technological equipment.", {
      x: M, y: 1.75, w: 6.6, h: 1.0, fontSize: 16, color: C.muted, valign: "top", objectName: nm(1, "fade"),
    });
    s.addImage({ path: "img/office.jpg", x: 7.6, y: 1.75, w: 5.133, h: 4.455, altText: "KHELA office with the company sign on the wall", objectName: nm(1, "fade") });
    const acts = [
      [Lu.LuArrowLeftRight, C.teal, "Buy & Sell", "Trade of machines and electronic devices"],
      [Lu.LuWrench, C.purple, "Repair & Maintain", "Technical services for industrial devices"],
      [Lu.LuRecycle, C.purple, "Refurbish & Resell", "Giving used equipment a second life"],
      [Lu.LuUsers, C.teal, "Skilled team", "Many workers and technicians"],
    ];
    const tw = 3.15, th = 1.5;
    for (let i = 0; i < 4; i++) {
      const [Ic, col, t, d] = acts[i], x = M + (i % 2) * (tw + 0.3), y = 2.95 + Math.floor(i / 2) * (th + 0.25), st = 2 + i;
      card(s, x, y, tw, th, st, "zoom");
      s.addImage({ data: await iconBadge(Ic, col), x: x + 0.25, y: y + 0.28, w: 0.58, h: 0.58, altText: t, objectName: nm(st, "zoom") });
      text(s, t, { x: x + 1.0, y: y + 0.25, w: tw - 1.15, h: 0.4, fontSize: 16, bold: true, valign: "middle", objectName: nm(st, "zoom") });
      text(s, d, { x: x + 1.0, y: y + 0.68, w: tw - 1.15, h: 0.65, fontSize: 13, color: C.muted, valign: "top", objectName: nm(st, "zoom") });
    }
    s.addShape("rect", { x: 7.6, y: 5.3, w: 5.133, h: 0.905, fill: { color: C.navy, transparency: 12 }, line: { type: "none" }, objectName: nm(6, "wipe") });
    s.addImage({ data: await iconBadge(Lu.LuLeaf, C.teal), x: 7.8, y: 5.47, w: 0.56, h: 0.56, altText: "Sustainability", objectName: nm(6, "wipe") });
    text(s, [
      { text: "Circular-economy model: ", options: { bold: true, color: C.tealLt } },
      { text: "refurbishing extends the life of equipment and reduces electronic waste." },
    ], { x: 8.55, y: 5.36, w: 4.0, h: 0.78, fontSize: 13, color: C.white, valign: "middle", objectName: nm(6, "wipe") });
    footer(s, 5);
    s.addNotes("KHELA is a medium-sized French company. Its main activities are buying and selling machines and electronics, repairing and maintaining devices, and refurbishing equipment for resale. It employs a significant number of workers and technicians. By refurbishing equipment, the company also follows a circular-economy model that reduces electronic waste.");
  }

  // ───────────────────────── 6. Tasks ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.light };
    header(s, "MY ROLE", "My Internship Tasks", { accent: C.purple });
    text(s, "My position was mainly administrative. I supported the office in five areas:", {
      x: M, y: 1.65, w: 11, h: 0.45, fontSize: 16, color: C.muted, objectName: nm(1, "fade"),
    });
    const colW = (W - 2 * M) / 5;
    s.addShape("line", { x: M + colW / 2, y: 3.3, w: colW * 4, h: 0, line: { color: "B9C3DA", width: 2, dashType: "dash" }, objectName: nm(2, "wipe") });
    const tasks = [
      [Lu.LuClipboardList, C.teal, "Administration", "Daily office and administrative work"],
      [Lu.LuFileText, C.purple, "Documents", "Preparing and editing professional documents"],
      [Lu.LuDatabase, C.navy, "Data", "Organising data and keeping records up to date"],
      [Lu.LuFolderOpen, C.teal, "Information", "Managing office information and files"],
      [Lu.LuSettings, C.purple, "Operations", "Supporting daily business activities"],
    ];
    for (let i = 0; i < 5; i++) {
      const [Ic, col, t, d] = tasks[i], cx = M + colW * i + colW / 2, st = 3 + i;
      text(s, `STEP ${i + 1}`, { x: cx - 1, y: 2.35, w: 2, h: 0.28, fontSize: 11, bold: true, charSpacing: 3, color: col, align: "center", objectName: nm(st, "zoom") });
      s.addImage({ data: await iconBadge(Ic, col), x: cx - 0.5, y: 2.8, w: 1.0, h: 1.0, altText: t, objectName: nm(st, "zoom") });
      text(s, t, { x: cx - 1.15, y: 3.98, w: 2.3, h: 0.4, fontSize: 18, bold: true, align: "center", objectName: nm(st, "float") });
      text(s, d, { x: cx - 1.1, y: 4.4, w: 2.2, h: 0.85, fontSize: 13, color: C.muted, align: "center", valign: "top", objectName: nm(st, "float") });
    }
    s.addShape("roundRect", { x: M, y: 5.55, w: W - 2 * M, h: 0.95, fill: { color: C.navy }, rectRadius: 0.12, line: { type: "none" }, objectName: nm(8, "float") });
    s.addImage({ data: await iconBadge(Lu.LuStar, C.purple), x: M + 0.3, y: 5.72, w: 0.6, h: 0.6, altText: "Core focus", objectName: nm(8, "float") });
    text(s, [
      { text: "Core focus: ", options: { bold: true, color: C.tealLt } },
      { text: "intensive daily use of Microsoft Word and Microsoft Excel — the backbone of every task above." },
    ], { x: M + 1.15, y: 5.6, w: 10.6, h: 0.85, fontSize: 16, color: C.white, valign: "middle", objectName: nm(8, "float") });
    footer(s, 6);
    s.addNotes("My position was mainly administrative. I handled daily office work, prepared and edited documents, organised data and kept records up to date, managed office information and files, and supported the company's daily operations. Word and Excel were my main tools every single day.");
  }

  // ───────────────────────── 7. Digital tools (dark) ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.navy };
    header(s, "DIGITAL TOOLS", "Office Work & Digital Tools", { dark: true });
    const tools = [
      [C.word, "W", null, "Microsoft Word", "Letters, reports and templates formatted to professional standards, with consistent styles and layouts."],
      [C.excel, "X", null, "Microsoft Excel", "Tables, inventories and records that keep company data organised, accurate and easy to update."],
      [C.purple, null, Lu.LuFolderCheck, "Document management", "A structured filing system with clear naming, so information can be found quickly."],
    ];
    for (let i = 0; i < 3; i++) {
      const [col, letter, Ic, t, d] = tools[i], x = M, y = 1.85 + i * 1.6, st = 1 + i;
      s.addShape("roundRect", { x, y, w: 6.3, h: 1.4, fill: { color: C.navy2 }, rectRadius: 0.12, line: { color: "2A3F7A", width: 0.75 }, objectName: nm(st, "float") });
      if (letter) {
        s.addText(letter, { x: x + 0.3, y: y + 0.3, w: 0.8, h: 0.8, shape: "roundRect", rectRadius: 0.1, fill: { color: col }, fontFace: BODY, fontSize: 28, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: nm(st, "float") });
      } else {
        s.addShape("roundRect", { x: x + 0.3, y: y + 0.3, w: 0.8, h: 0.8, fill: { color: col }, rectRadius: 0.1, line: { type: "none" }, objectName: nm(st, "float") });
        s.addImage({ data: await iconBadge(Ic, null), x: x + 0.3, y: y + 0.3, w: 0.8, h: 0.8, altText: t, objectName: nm(st, "float") });
      }
      text(s, t, { x: x + 1.35, y: y + 0.2, w: 4.75, h: 0.4, fontSize: 18, bold: true, color: C.white, valign: "middle", objectName: nm(st, "float") });
      text(s, d, { x: x + 1.35, y: y + 0.62, w: 4.75, h: 0.65, fontSize: 13, color: "C3CCE3", valign: "top", objectName: nm(st, "float") });
    }
    // workflow panel
    const px = 7.3, pw = W - M - px;
    s.addShape("roundRect", { x: px, y: 1.85, w: pw, h: 4.6, fill: { color: C.white }, rectRadius: 0.12, line: { type: "none" }, objectName: nm(4, "fade") });
    text(s, "MY TYPICAL WORKFLOW", { x: px + 0.4, y: 2.1, w: pw - 0.8, h: 0.3, fontSize: 12, bold: true, charSpacing: 3, color: C.purple, objectName: nm(4, "fade") });
    s.addShape("line", { x: px + 0.7, y: 2.9, w: 0, h: 2.94, line: { color: C.line, width: 2 }, objectName: nm(4, "fade") });
    const flow = [
      [Lu.LuInbox, C.teal, "Collect", "Gather information from colleagues and operations"],
      [Lu.LuTable, C.excel, "Record", "Enter and organise the data in Excel"],
      [Lu.LuFilePen, C.word, "Produce", "Turn it into clear, professional documents in Word"],
      [Lu.LuArchive, C.purple, "File", "Archive everything so it is easy to retrieve"],
    ];
    for (let i = 0; i < 4; i++) {
      const [Ic, col, t, d] = flow[i], y = 2.6 + i * 0.98, st = 5 + i;
      s.addImage({ data: await iconBadge(Ic, col), x: px + 0.4, y, w: 0.6, h: 0.6, altText: t, objectName: nm(st, "zoom") });
      text(s, t, { x: px + 1.2, y: y - 0.04, w: pw - 1.5, h: 0.32, fontSize: 16, bold: true, objectName: nm(st, "float") });
      text(s, d, { x: px + 1.2, y: y + 0.3, w: pw - 1.5, h: 0.5, fontSize: 13, color: C.muted, valign: "top", objectName: nm(st, "float") });
    }
    footer(s, 7, true);
    s.addNotes("In Word, I created and formatted letters, reports and templates to professional standards. In Excel, I built tables, inventories and records to keep data accurate and organised. I also helped keep a structured filing system so information could be found quickly. A typical task followed four steps: collect the information, record it in Excel, produce the document in Word, and file it.");
  }

  // ───────────────────────── 8. Skills ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.light };
    header(s, "RESULTS", "Skills & Achievements");
    const cols = [
      [C.teal, Lu.LuCpu, "Technical", [["Microsoft Word", "Professional documents and templates"], ["Microsoft Excel", "Structured tables and records"], ["Data management", "Accurate, well-organised information"]]],
      [C.purple, Lu.LuBriefcase, "Professional", [["Problem-solving", "Practical solutions to daily issues"], ["Organisation", "Records kept complete and up to date"], ["Business support", "Helping daily operations run smoothly"]]],
      [C.navy, Lu.LuHeartHandshake, "Interpersonal", [["Communication", "Clear exchanges with colleagues"], ["Teamwork", "Collaboration in a multicultural team"], ["Adaptability", "Adjusting to a new culture and workplace"]]],
    ];
    const cw = (W - 2 * M - 0.6) / 3;
    for (let i = 0; i < 3; i++) {
      const [col, Ic, t, list] = cols[i], x = M + i * (cw + 0.3), st = 1 + i;
      card(s, x, 1.85, cw, 4.65, st, "float");
      s.addShape("roundRect", { x, y: 1.85, w: cw, h: 1.0, fill: { color: col }, rectRadius: 0.12, line: { type: "none" }, objectName: nm(st, "float") });
      s.addShape("rect", { x, y: 2.55, w: cw, h: 0.3, fill: { color: col }, line: { type: "none" }, objectName: nm(st, "float") });
      s.addImage({ data: await iconBadge(Ic, null), x: x + 0.35, y: 2.07, w: 0.56, h: 0.56, altText: t, objectName: nm(st, "float") });
      text(s, t, { x: x + 1.1, y: 1.95, w: cw - 1.3, h: 0.8, fontFace: HEAD, fontSize: 24, bold: true, color: C.white, valign: "middle", objectName: nm(st, "float") });
      for (let j = 0; j < 3; j++) {
        const y = 3.15 + j * 1.1;
        s.addImage({ data: await iconBadge(Lu.LuCheck, col), x: x + 0.35, y: y + 0.04, w: 0.36, h: 0.36, altText: "check", objectName: nm(st, "float") });
        text(s, list[j][0], { x: x + 0.9, y, w: cw - 1.2, h: 0.42, fontSize: 17, bold: true, valign: "middle", objectName: nm(st, "float") });
        text(s, list[j][1], { x: x + 0.9, y: y + 0.42, w: cw - 1.2, h: 0.4, fontSize: 13, color: C.muted, valign: "top", objectName: nm(st, "float") });
      }
    }
    footer(s, 8);
    s.addNotes("I developed three groups of skills. Technical: strong Word and Excel skills and data management. Professional: problem-solving, organising records and supporting business operations. Interpersonal: communication, teamwork in a multicultural team, and adapting to an international environment.");
  }

  // ───────────────────────── 9. Challenges ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.light };
    header(s, "LESSONS LEARNED", "Challenges & How I Handled Them", { accent: C.purple });
    const lx = M, lw = 5.2, rx = 7.33, rw = W - M - rx;
    text(s, "THE CHALLENGE", { x: lx, y: 1.65, w: lw, h: 0.3, fontSize: 12, bold: true, charSpacing: 3, color: C.purple, objectName: nm(1, "fade") });
    text(s, "MY RESPONSE", { x: rx, y: 1.65, w: rw, h: 0.3, fontSize: 12, bold: true, charSpacing: 3, color: C.teal, objectName: nm(1, "fade") });
    const rows = [
      [Lu.LuLanguages, "A new language and work culture", "Listened carefully, asked questions and adapted to French workplace habits step by step."],
      [Lu.LuLayers, "Large amounts of information", "Built clear Excel tables and a consistent filing structure to keep everything organised."],
      [Lu.LuListChecks, "Many different daily tasks", "Prioritised my work and kept tidy records so nothing was missed."],
    ];
    for (let i = 0; i < 3; i++) {
      const [Ic, c, r] = rows[i], y = 2.05 + i * 1.47, st = 2 + i * 2;
      s.addShape("roundRect", { x: lx, y, w: lw, h: 1.2, fill: { color: C.purpleTint }, rectRadius: 0.12, line: { type: "none" }, objectName: nm(st, "float") });
      s.addImage({ data: await iconBadge(Ic, C.purple), x: lx + 0.3, y: y + 0.3, w: 0.6, h: 0.6, altText: c, objectName: nm(st, "float") });
      text(s, c, { x: lx + 1.15, y: y + 0.1, w: lw - 1.35, h: 1.0, fontSize: 17, bold: true, valign: "middle", objectName: nm(st, "float") });
      s.addImage({ data: await iconBadge(Lu.LuArrowRight, null, "#1695B9"), x: 6.17, y: y + 0.25, w: 0.7, h: 0.7, altText: "leads to", objectName: nm(st + 1, "fade") });
      s.addShape("roundRect", { x: rx, y, w: rw, h: 1.2, fill: { color: C.white }, rectRadius: 0.12, line: { color: C.line, width: 0.75 }, shadow: shadow(), objectName: nm(st + 1, "wipe") });
      text(s, r, { x: rx + 0.35, y: y + 0.1, w: rw - 0.6, h: 1.0, fontSize: 15, color: C.ink, valign: "middle", objectName: nm(st + 1, "wipe") });
    }
    footer(s, 9);
    s.addNotes("Like any mobility, this internship came with challenges. Working in a new language and business culture required me to listen carefully, ask questions and adapt step by step. The volume of information I handled pushed me to build clear Excel tables and a consistent filing structure. And with many different daily tasks, I learned to prioritise and keep tidy records so nothing was missed.");
  }

  // ───────────────────────── 10. Personal growth ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.light };
    header(s, "PERSONAL GROWTH", "My Erasmus Experience");
    const g = [
      [Lu.LuGlobe, C.teal, "Cultural adaptation", "Adjusting to French work habits, language and everyday life."],
      [Lu.LuUsers, C.purple, "International experience", "Collaborating with colleagues from different backgrounds and cultures."],
      [Lu.LuCompass, C.navy, "Independence", "Managing daily life abroad on my own built confidence and responsibility."],
      [Lu.LuRocket, C.teal, "Future benefits", "A stronger CV and real readiness for a European career."],
    ];
    const cw = (W - 2 * M - 0.3) / 2, ch = 2.1;
    for (let i = 0; i < 4; i++) {
      const [Ic, col, t, d] = g[i], x = M + (i % 2) * (cw + 0.3), y = 1.95 + Math.floor(i / 2) * (ch + 0.3), st = 1 + i;
      card(s, x, y, cw, ch, st, "zoom");
      s.addImage({ data: await iconBadge(Ic, col), x: x + 0.4, y: y + 0.55, w: 1.0, h: 1.0, altText: t, objectName: nm(st, "zoom") });
      text(s, t, { x: x + 1.75, y: y + 0.4, w: cw - 2.1, h: 0.5, fontSize: 21, bold: true, valign: "middle", objectName: nm(st, "zoom") });
      text(s, d, { x: x + 1.75, y: y + 0.95, w: cw - 2.1, h: 0.85, fontSize: 15, color: C.muted, valign: "top", objectName: nm(st, "zoom") });
    }
    footer(s, 10);
    s.addNotes("Beyond work, Erasmus helped me grow personally. I adapted to a new culture, worked in an international setting, became more independent by managing daily life abroad, and gained experience that will strengthen my future career in Europe.");
  }

  // ───────────────────────── 11. Conclusion ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.light };
    header(s, "CONCLUSION", "Key Takeaways", { accent: C.purple });
    const k = [
      [Lu.LuBuilding, C.teal, "Real office experience", "Genuine daily responsibilities inside a French company."],
      [Lu.LuLaptop, C.purple, "Strong digital skills", "Confident, efficient use of Word and Excel for real business needs."],
      [Lu.LuPlane, C.navy, "International confidence", "Ready to live and work in an international environment."],
    ];
    const cw = (W - 2 * M - 0.6) / 3;
    for (let i = 0; i < 3; i++) {
      const [Ic, col, t, d] = k[i], x = M + i * (cw + 0.3), y = 1.85, st = 1 + i;
      card(s, x, y, cw, 3.0, st, "float");
      s.addImage({ data: await iconBadge(Ic, col), x: x + cw / 2 - 0.5, y: y + 0.35, w: 1.0, h: 1.0, altText: t, objectName: nm(st, "float") });
      text(s, t, { x: x + 0.3, y: y + 1.55, w: cw - 0.6, h: 0.45, fontSize: 20, bold: true, align: "center", objectName: nm(st, "float") });
      text(s, d, { x: x + 0.35, y: y + 2.05, w: cw - 0.7, h: 0.75, fontSize: 14, color: C.muted, align: "center", valign: "top", objectName: nm(st, "float") });
    }
    s.addShape("roundRect", { x: M, y: 5.2, w: W - 2 * M, h: 1.25, fill: { color: C.navy }, rectRadius: 0.12, line: { type: "none" }, objectName: nm(4, "wipe") });
    s.addImage({ data: await iconBadge(Lu.LuHeart, C.purple), x: M + 0.35, y: 5.5, w: 0.65, h: 0.65, altText: "Thanks", objectName: nm(4, "wipe") });
    text(s, [
      { text: "Acknowledgements  ", options: { bold: true, color: C.tealLt } },
      { text: "I sincerely thank KVK, KHELA and the Erasmus+ programme for this opportunity, and my colleagues in France for their support and trust." },
    ], { x: M + 1.3, y: 5.3, w: 10.5, h: 1.05, fontSize: 16, color: C.white, valign: "middle", objectName: nm(4, "wipe") });
    footer(s, 11);
    s.addNotes("To conclude, this internship gave me real office experience, strong digital skills and the confidence to work internationally. I would like to thank KVK, KHELA and the Erasmus+ programme for this opportunity, and my colleagues in France for their support.");
  }

  // ───────────────────────── 12. Thank you ─────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.navy };
    s.addImage({ path: "img/bordeaux_wide.jpg", x: 0, y: 0, w: W, h: H, altText: "French city square at dusk" });
    s.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: C.navy, transparency: 18 }, line: { type: "none" } });
    text(s, "ERASMUS+ INTERNSHIP DEFENCE", { x: 0, y: 2.0, w: W, h: 0.35, fontSize: 13, bold: true, charSpacing: 6, color: C.tealLt, align: "center", objectName: nm(0, "fade") });
    text(s, "Thank you!", { x: 0, y: 2.45, w: W, h: 1.4, fontFace: HEAD, fontSize: 72, bold: true, italic: true, color: C.white, align: "center", valign: "middle", objectName: nm(1, "zoom") });
    text(s, "Questions are welcome.", { x: 0, y: 3.95, w: W, h: 0.55, fontSize: 24, color: "D5DCEE", align: "center", objectName: nm(2, "float") });
    text(s, "Haithem Cheniti  ·  Erasmus+ internship at KHELA, France", { x: 0, y: 4.55, w: W, h: 0.4, fontSize: 15, color: "AEB9D6", align: "center", objectName: nm(2, "float") });
    s.addShape("roundRect", { x: 5.0, y: 5.5, w: 1.55, h: 0.6, fill: { color: C.white }, rectRadius: 0.1, line: { type: "none" }, objectName: nm(3, "fade") });
    s.addImage({ path: "img/kvk.png", x: 5.29, y: 5.59, w: 0.97, h: 0.4, altText: "KVK logo", objectName: nm(3, "fade") });
    s.addText("Erasmus+", { x: 6.78, y: 5.5, w: 1.55, h: 0.6, shape: "roundRect", rectRadius: 0.1, fill: { color: C.white }, fontFace: BODY, fontSize: 17, bold: true, color: C.erasmus, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: nm(3, "fade") });
    s.addNotes("Thank you for your attention. I am happy to answer your questions.");
  }

  await pres.writeFile({ fileName: "raw.pptx" });
  console.log("wrote raw.pptx");
})();

// Builds the internship defense deck (static layout).
// Animations + transitions are added afterwards by animate.py, which reads the
// shape names: "a<step>-<effect>" (e.g. "a3-zoom"). Same step = same moment.
const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");
const gi = require("react-icons/gi");
const tb = require("react-icons/tb");

const OUT = process.argv[2] || "Internship_France_Defense_raw.pptx";

// ---------- palette & fonts ----------
const NAVY = "1B2A4A";
const NAVY2 = "2A3F68";
const GOLD = "D9973A";
const GOLD_SOFT = "F2C98A";
const TINT = "F3F5F9";
const GOLD_TINT = "FBF1E2";
const MUTED = "5B6577";
const LIGHT = "C9D3E6";
const WHITE = "FFFFFF";
const FR_BLUE = "0055A4";
const FR_RED = "EF4135";
const HEAD = "Cambria";
const BODY = "Calibri";

const W = 13.333;
const H = 7.5;
const TOTAL = 13;

// ---------- helpers ----------
const iconCache = {};
async function icon(Comp, color, size = 256) {
  const key = Comp.name + color + size;
  if (iconCache[key]) return iconCache[key];
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size }));
  const buf = await sharp(Buffer.from(svg)).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  iconCache[key] = "image/png;base64," + buf.toString("base64");
  return iconCache[key];
}

async function bgImage(file, cx, cy) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
    <defs><radialGradient id="g" cx="${cx}" cy="${cy}" r="0.75">
      <stop offset="0" stop-color="#${NAVY2}"/><stop offset="1" stop-color="#${NAVY}"/>
    </radialGradient></defs>
    <rect width="1920" height="1080" fill="url(#g)"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  return file;
}

const T = (extra) => Object.assign({ isTextBox: true, fontFace: BODY, color: NAVY, margin: 0, valign: "top" }, extra);

function header(slide, kicker, title) {
  slide.addText(kicker.toUpperCase(), T({ x: 0.7, y: 0.5, w: 9, h: 0.3, fontSize: 13, bold: true, color: GOLD, charSpacing: 3 }));
  slide.addText(title, T({ x: 0.7, y: 0.82, w: 11.9, h: 0.8, fontSize: 34, bold: true, fontFace: HEAD, valign: "middle" }));
}

function footer(slide, n, dark = false) {
  slide.addText("Djoudi Mohamed Salah E  ·  Erasmus+ internship, France 2026", T({ x: 0.7, y: 7.0, w: 7, h: 0.28, fontSize: 10, color: dark ? LIGHT : MUTED }));
  slide.addText(`${n} / ${TOTAL}`, T({ x: 11.63, y: 7.0, w: 1.0, h: 0.28, fontSize: 10, color: MUTED, align: "right" }));
}

// gold circle with white icon (the deck's motif)
async function iconCircle(slide, IconComp, x, y, d, name, fill = GOLD, iconColor = WHITE) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: name });
  const s = d * 0.52;
  slide.addImage({ data: await icon(IconComp, iconColor), x: x + (d - s) / 2, y: y + (d - s) / 2, w: s, h: s, objectName: name });
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "Djoudi Mohamed Salah E";
  pres.title = "My Internship in France – Boulangerie D.O";

  const bgTitle = await bgImage("bg_title.png", "0.72", "0.45");
  const bgEnd = await bgImage("bg_end.png", "0.5", "0.4");

  // =====================================================================
  // 1. TITLE
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { path: bgTitle };
    [FR_BLUE, WHITE, FR_RED].forEach((c, i) =>
      s.addShape("ellipse", { x: 0.75 + i * 0.3, y: 1.53, w: 0.2, h: 0.2, fill: { color: c }, line: { color: c, width: 0 }, objectName: "a1-fade" })
    );
    s.addText("ERASMUS+ INTERNSHIP  ·  DEFENSE", T({ x: 1.75, y: 1.43, w: 6, h: 0.4, fontSize: 14, bold: true, color: GOLD, charSpacing: 4, valign: "middle", objectName: "a1-fade" }));
    s.addText("My Internship\nin France", T({ x: 0.75, y: 2.0, w: 7.2, h: 2.0, fontSize: 54, bold: true, fontFace: HEAD, color: WHITE, valign: "middle", objectName: "a2-float" }));
    s.addText("Boulangerie D.O  ·  Creil", T({ x: 0.75, y: 4.1, w: 7, h: 0.55, fontSize: 26, color: GOLD_SOFT, fontFace: HEAD, italic: true, objectName: "a3-float" }));
    s.addText([
      { text: "Djoudi Mohamed Salah E", options: { fontSize: 20, bold: true, color: WHITE, breakLine: true } },
      { text: "5 June – 25 August 2026   |   Academic year 2025/2026", options: { fontSize: 15, color: LIGHT } },
    ], T({ x: 0.75, y: 5.25, w: 7.2, h: 0.9, paraSpaceAfter: 4, objectName: "a4-fade" }));

    s.addShape("ellipse", { x: 7.8, y: 1.15, w: 5.2, h: 5.2, fill: { type: "none" }, line: { color: GOLD, width: 1.5, transparency: 50 }, objectName: "a1-zoom" });
    s.addShape("ellipse", { x: 8.1, y: 1.45, w: 4.6, h: 4.6, fill: { color: GOLD }, line: { color: GOLD, width: 0 }, objectName: "a1-zoom" });
    s.addImage({ data: await icon(gi.GiCroissant, NAVY, 512), x: 8.95, y: 2.3, w: 2.9, h: 2.9, objectName: "a2-zoom" });

    s.addNotes(
      "Good morning / Good afternoon. My name is Djoudi Mohamed Salah E. " +
      "Today I will present my Erasmus+ internship in France. " +
      "I did my internship at Boulangerie D.O, a bakery in the city of Creil. " +
      "It lasted from 5 June to 25 August 2026."
    );
  }

  // =====================================================================
  // 2. AGENDA
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    s.addShape("rect", { x: 0, y: 0, w: 4.6, h: H, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    s.addText("TODAY", T({ x: 0.7, y: 2.2, w: 3.5, h: 0.3, fontSize: 13, bold: true, color: GOLD, charSpacing: 3 }));
    s.addText("What I will\ntalk about", T({ x: 0.7, y: 2.6, w: 3.6, h: 1.6, fontSize: 40, bold: true, fontFace: HEAD, color: WHITE }));
    s.addImage({ data: await icon(tb.TbBuildingEiffelTower, GOLD, 512), x: 0.7, y: 4.55, w: 1.3, h: 1.3, objectName: "a1-zoom" });

    const items = [
      ["The company", "Where I did my internship"],
      ["My goal", "What the internship was about"],
      ["My tasks", "What I did at the bakery"],
      ["What I learned", "How a business and its customers work"],
      ["My results", "My evaluation from the company"],
      ["Conclusion", "What this experience gave me"],
    ];
    items.forEach(([t, d], i) => {
      const y = 0.8 + i * 1.03;
      const n = `a${i + 2}-float`;
      s.addText(String(i + 1), T({ shape: "ellipse", x: 5.4, y, w: 0.72, h: 0.72, fill: { color: GOLD }, fontSize: 22, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: HEAD, objectName: n }));
      s.addText(t, T({ x: 6.45, y: y - 0.02, w: 6.2, h: 0.42, fontSize: 22, bold: true, fontFace: HEAD, objectName: n }));
      s.addText(d, T({ x: 6.45, y: y + 0.4, w: 6.2, h: 0.32, fontSize: 15, color: MUTED, objectName: n }));
    });
    s.addText(`2 / ${TOTAL}`, T({ x: 11.63, y: 7.0, w: 1.0, h: 0.28, fontSize: 10, color: MUTED, align: "right" }));
    s.addNotes(
      "This is the plan of my presentation. " +
      "First, I will present the company. Then I will explain the goal of my internship and my main tasks. " +
      "After that, I will talk about what I learned and my results. " +
      "At the end, I will give my conclusion."
    );
  }

  // =====================================================================
  // 3. WHERE (map + facts)
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "Where", "Where I did my internship");

    const mx = 0.8, my = 1.95, ms = 4.5;
    s.addImage({ data: await icon(gi.GiFrance, "D5DDEA", 512), x: mx, y: my, w: ms, h: ms, objectName: "a1-zoom" });
    // Creil ≈ (278,113) in the 512px icon
    const cx = mx + (278 / 512) * ms, cy = my + (113 / 512) * ms;
    const pin = 0.6;
    s.addImage({ data: await icon(fa.FaLocationDot, FR_RED, 256), x: cx - pin / 2, y: cy - pin, w: pin, h: pin, objectName: "a2-drop" });
    s.addText([
      { text: "Creil", options: { fontSize: 18, bold: true, fontFace: HEAD, breakLine: true } },
      { text: "about 50 km north of Paris", options: { fontSize: 12, color: MUTED } },
    ], T({ x: cx + 0.4, y: cy - 0.62, w: 2.4, h: 0.7, objectName: "a3-fade" }));
    s.addText("France", T({ x: mx + 1.3, y: my + 2.8, w: 2.0, h: 0.5, fontSize: 22, bold: true, fontFace: HEAD, color: "8A97AD", align: "center", objectName: "a3-fade" }));

    const facts = [
      [gi.GiCroissant, "COMPANY", "Boulangerie D.O (a bakery)"],
      [fa.FaLocationDot, "ADDRESS", "59 Rue Gambetta, 60100 Creil, France"],
      [fa.FaCalendarDays, "DATES", "5 June – 25 August 2026 (almost 3 months)"],
      [fa.FaUserTie, "SUPERVISOR", "Mr. Djamel Ounnadi, Director"],
    ];
    for (let i = 0; i < facts.length; i++) {
      const [ic, lab, val] = facts[i];
      const y = 2.0 + i * 1.15;
      const n = `a${i + 4}-float`;
      await iconCircle(s, ic, 6.1, y, 0.82, n);
      s.addText(lab, T({ x: 7.2, y: y + 0.03, w: 5.4, h: 0.28, fontSize: 12, bold: true, color: GOLD, charSpacing: 2, objectName: n }));
      s.addText(val, T({ x: 7.2, y: y + 0.33, w: 5.4, h: 0.45, fontSize: 19, bold: true, objectName: n }));
    }
    footer(s, 3);
    s.addNotes(
      "I did my internship in France, in a city called Creil. Creil is about 50 kilometres north of Paris. " +
      "The company is Boulangerie D.O, a bakery at 59 Rue Gambetta. " +
      "My internship lasted almost three months, from 5 June to 25 August 2026. " +
      "My supervisor was Mr. Djamel Ounnadi, the director of the bakery."
    );
  }

  // =====================================================================
  // 4. THE COMPANY
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "The company", "Boulangerie D.O – a French bakery");
    s.addText("A local bakery in Creil. It makes fresh bread, pastries and cakes and sells them to customers in its shop.",
      T({ x: 0.7, y: 1.85, w: 11.9, h: 0.75, fontSize: 19, color: MUTED, objectName: "a1-fade" }));

    const cards = [
      [gi.GiSlicedBread, "Production", "The pastry chef and the team prepare bread, pastries and cakes."],
      [fa.FaStore, "Shop & sales", "The team serves customers and takes payments at the cash register."],
      [fa.FaUserTie, "Management", "The director organises the team, the documents and the money."],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, t, d] = cards[i];
      const x = 0.7 + i * 4.08, y = 2.95, w = 3.78;
      const n = `a${i + 2}-zoom`;
      s.addShape("roundRect", { x, y, w, h: 3.45, fill: { color: TINT }, line: { color: TINT, width: 0 }, rectRadius: 0.15, objectName: n });
      await iconCircle(s, ic, x + 0.4, y + 0.4, 1.0, n);
      s.addText(t, T({ x: x + 0.4, y: y + 1.6, w: w - 0.8, h: 0.45, fontSize: 22, bold: true, fontFace: HEAD, objectName: n }));
      s.addText(d, T({ x: x + 0.4, y: y + 2.1, w: w - 0.8, h: 1.1, fontSize: 16, color: MUTED, objectName: n }));
    }
    footer(s, 4);
    s.addNotes(
      "Boulangerie D.O is a local bakery in Creil. It makes fresh bread, pastries and cakes, and sells them in its shop. " +
      "The work has three main parts. " +
      "Production: the pastry chef prepares the products. " +
      "Shop and sales: the team serves customers and takes payments. " +
      "Management: the director organises the team, the documents and the money."
    );
  }

  // =====================================================================
  // 5. MY GOAL
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "My goal", "What was my internship about?");
    s.addShape("roundRect", { x: 0.7, y: 1.9, w: 11.93, h: 1.25, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.15, objectName: "a1-wipe" });
    s.addText("OFFICIAL TITLE OF MY INTERNSHIP", T({ x: 1.1, y: 2.08, w: 11, h: 0.28, fontSize: 12, bold: true, color: GOLD, charSpacing: 2, objectName: "a1-wipe" }));
    s.addText("Administrative Skills Training and Customer Relationship Management", T({ x: 1.1, y: 2.4, w: 11.2, h: 0.55, fontSize: 23, italic: true, fontFace: HEAD, color: WHITE, objectName: "a1-wipe" }));

    const cols = [
      [fa.FaFolderOpen, "Administration", "Learn how a business is organised: documents, planning, people and management."],
      [fa.FaHandshake, "Customers (CRM)", "Learn how to understand customers, help them well, and make them come back."],
    ];
    const chips = [["Documents", "Planning", "Team"], ["Needs", "Service", "Loyalty"]];
    for (let i = 0; i < 2; i++) {
      const [ic, t, d] = cols[i];
      const x = i === 0 ? 0.7 : 7.03, y = 3.5, w = 5.6;
      const n = i === 0 ? "a2-float" : "a4-float";
      s.addShape("roundRect", { x, y, w, h: 2.95, fill: { color: TINT }, line: { color: TINT, width: 0 }, rectRadius: 0.15, objectName: n });
      await iconCircle(s, ic, x + 0.45, y + 0.45, 0.95, n);
      s.addText(t, T({ x: x + 1.6, y: y + 0.45, w: w - 2.0, h: 0.95, fontSize: 24, bold: true, fontFace: HEAD, valign: "middle", objectName: n }));
      s.addText(d, T({ x: x + 0.45, y: y + 1.5, w: w - 0.9, h: 0.8, fontSize: 17, color: MUTED, objectName: n }));
      chips[i].forEach((c, k) => {
        s.addText(c, T({ shape: "roundRect", x: x + 0.45 + k * 1.6, y: y + 2.35, w: 1.45, h: 0.4, rectRadius: 0.2, fill: { color: WHITE }, line: { color: GOLD, width: 1 }, fontSize: 13, bold: true, color: NAVY, align: "center", valign: "middle", objectName: n }));
      });
    }
    s.addText("+", T({ shape: "ellipse", x: 6.39, y: 4.68, w: 0.55, h: 0.55, fill: { color: GOLD }, fontSize: 24, bold: true, color: WHITE, align: "center", valign: "middle", objectName: "a3-zoom" }));
    footer(s, 5);
    s.addNotes(
      "The official title of my internship was: Administrative Skills Training and Customer Relationship Management. " +
      "In simple words, I had two goals. " +
      "The first goal was administration: to learn how a real business is organised, with documents, planning, people and management. " +
      "The second goal was customers: to learn how to understand customers, help them, and make them come back."
    );
  }

  // =====================================================================
  // 6. MY TASKS (2 x 3 grid)
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "My tasks", "What I did at the bakery");
    const tasks = [
      [fa.FaCashRegister, "Cashier work", "I worked at the cash register and took payments."],
      [fa.FaComments, "Customer service", "I served customers and answered their questions and requests."],
      [gi.GiCroissant, "Helping the pastry chef", "I helped in production and learned how products are made."],
      [fa.FaFolderOpen, "Documents", "I organised business documents and information."],
      [fa.FaCalendarCheck, "Daily planning", "I helped to plan and coordinate the daily work."],
      [fa.FaCalculator, "Accounting support", "I learned the basic money flows and helped with accounting tasks."],
    ];
    for (let i = 0; i < 6; i++) {
      const [ic, t, d] = tasks[i];
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.7 + col * 4.08, y = 1.95 + row * 2.45, w = 3.78;
      const n = `a${i + 1}-zoom`;
      s.addShape("roundRect", { x, y, w, h: 2.15, fill: { color: TINT }, line: { color: TINT, width: 0 }, rectRadius: 0.15, objectName: n });
      await iconCircle(s, ic, x + 0.3, y + 0.32, 0.8, n);
      s.addText(t, T({ x: x + 1.25, y: y + 0.32, w: w - 1.5, h: 0.8, fontSize: 19, bold: true, fontFace: HEAD, valign: "middle", objectName: n }));
      s.addText(d, T({ x: x + 0.3, y: y + 1.25, w: w - 0.6, h: 0.75, fontSize: 15, color: MUTED, objectName: n }));
    }
    footer(s, 6);
    s.addNotes(
      "Here are my main tasks. " +
      "I worked as a cashier and took payments. I served customers and answered their questions. " +
      "I also helped the pastry chef, so I learned how the products are made. " +
      "On the administrative side, I organised documents, helped to plan the daily work, " +
      "and I learned the basic money flows by helping with accounting tasks."
    );
  }

  // =====================================================================
  // 7. HOW THE BAKERY WORKS (process)
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "How it works", "How the bakery works – step by step");
    const steps = [
      [fa.FaCalendarCheck, "Plan", "The director plans the day and the team."],
      [gi.GiCroissant, "Make", "The pastry chef bakes fresh products."],
      [fa.FaCashRegister, "Sell", "The shop team serves customers and takes payments."],
      [fa.FaCalculator, "Count", "Sales and costs go to accounting."],
      [fa.FaLightbulb, "Improve", "We check the results and find better ways."],
    ];
    const cxs = steps.map((_, i) => 1.75 + i * (9.83 / 4));
    const cyLine = 3.55;
    s.addShape("line", { x: cxs[0], y: cyLine, w: cxs[4] - cxs[0], h: 0, line: { color: GOLD, width: 3 }, objectName: "a1-wipe" });
    for (let i = 0; i < 5; i++) {
      const [ic, t, d] = steps[i];
      const cx = cxs[i];
      const n = `a${i + 2}-zoom`;
      await iconCircle(s, ic, cx - 0.7, cyLine - 0.7, 1.4, n, NAVY, GOLD_SOFT);
      s.addText(String(i + 1), T({ shape: "ellipse", x: cx + 0.28, y: cyLine - 0.85, w: 0.46, h: 0.46, fill: { color: GOLD }, line: { color: WHITE, width: 2 }, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle", objectName: n }));
      s.addText(t, T({ x: cx - 1.15, y: 4.45, w: 2.3, h: 0.45, fontSize: 20, bold: true, fontFace: HEAD, align: "center", objectName: n }));
      s.addText(d, T({ x: cx - 1.1, y: 4.92, w: 2.2, h: 1.0, fontSize: 14, color: MUTED, align: "center", objectName: n }));
    }
    s.addText("I took part in each step: planning, helping the pastry chef, selling and accounting.",
      T({ shape: "roundRect", x: 1.4, y: 6.08, w: 10.53, h: 0.62, rectRadius: 0.12, fill: { color: GOLD_TINT }, fontSize: 16, italic: true, align: "center", valign: "middle", objectName: "a7-fade" }));
    footer(s, 7);
    s.addNotes(
      "This slide shows how the bakery works, step by step. " +
      "First, the director plans the day and the team. Second, the pastry chef makes fresh products. " +
      "Third, the shop team sells the products to customers. Fourth, sales and costs go to accounting. " +
      "And last, we check the results and look for better ways to work. " +
      "During my internship I took part in each of these steps."
    );
  }

  // =====================================================================
  // 8. CUSTOMERS (CRM cycle)
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "Customer relationship", "Taking care of customers");
    const ccx = 3.9, ccy = 4.35, R = 1.75;
    s.addShape("ellipse", { x: ccx - R, y: ccy - R, w: 2 * R, h: 2 * R, fill: { type: "none" }, line: { color: GOLD, width: 2.5, dashType: "dash" }, objectName: "a1-zoom" });
    s.addShape("ellipse", { x: ccx - 0.95, y: ccy - 0.95, w: 1.9, h: 1.9, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, objectName: "a1-zoom" });
    s.addImage({ data: await icon(fa.FaHeart, GOLD), x: ccx - 0.3, y: ccy - 0.62, w: 0.6, h: 0.6, objectName: "a1-zoom" });
    s.addText("Happy\ncustomer", T({ x: ccx - 0.9, y: ccy + 0.02, w: 1.8, h: 0.6, fontSize: 14, bold: true, color: WHITE, align: "center", objectName: "a1-zoom" }));

    const cyc = [
      [fa.FaEarListen, "Listen", "understand what the customer needs", 0, -1, "right"],
      [fa.FaHandHoldingHeart, "Help", "answer questions and handle requests", 1, 0, "below"],
      [fa.FaPuzzlePiece, "Solve", "fix problems quickly and politely", 0, 1, "right"],
      [fa.FaStar, "Keep", "good service makes loyal customers", -1, 0, "left"],
    ];
    const d = 1.0;
    for (let i = 0; i < 4; i++) {
      const [ic, word, desc, dx, dy, lp] = cyc[i];
      const sx = ccx + dx * R, sy = ccy + dy * R;
      const n = `a${i + 2}-zoom`;
      await iconCircle(s, ic, sx - d / 2, sy - d / 2, d, n);
      let lab;
      if (lp === "right") lab = { x: sx + 0.65, y: dy < 0 ? sy - 0.35 : sy - 0.05, w: 1.3, h: 0.4, align: "left" };
      else if (lp === "below") lab = { x: sx - 0.05, y: sy + 0.55, w: 1.2, h: 0.4, align: "left" };
      else lab = { x: sx - 1.95, y: sy - 0.2, w: 1.35, h: 0.4, align: "right" };
      s.addText(word, T(Object.assign({ fontSize: 17, bold: true, fontFace: HEAD, objectName: n }, lab)));
      s.addText([
        { text: `${i + 1}. ${word}  `, options: { bold: true, color: NAVY, fontFace: HEAD, fontSize: 19 } },
        { text: `– ${desc}`, options: { color: MUTED, fontSize: 16 } },
      ], T({ x: 7.0, y: 2.0 + i * 0.92, w: 5.63, h: 0.75, valign: "middle", objectName: n }));
    }
    s.addText([
      { text: "Main lesson: ", options: { bold: true, color: GOLD } },
      { text: "a happy customer comes back!", options: { bold: true, color: NAVY } },
    ], T({ shape: "roundRect", x: 7.0, y: 5.85, w: 5.63, h: 0.85, rectRadius: 0.12, fill: { color: GOLD_TINT }, fontSize: 18, align: "center", valign: "middle", objectName: "a6-zoom" }));
    footer(s, 8);
    s.addNotes(
      "An important part of my internship was customer relationship management, or CRM. " +
      "I learned that good service is a cycle. " +
      "First, listen and understand what the customer needs. Second, help: answer questions and handle requests. " +
      "Third, solve problems quickly and politely. Fourth, keep the customer: good service makes loyal customers. " +
      "The main lesson for me is simple: a happy customer comes back."
    );
  }

  // =====================================================================
  // 9. SKILLS (honeycomb)
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "My new skills", "Skills I developed");
    s.addText("This internship helped me grow at work and as a person.",
      T({ x: 0.7, y: 2.3, w: 5.6, h: 1.1, fontSize: 24, bold: true, fontFace: HEAD, objectName: "a1-fade" }));
    s.addText("PRACTICAL SKILLS", T({ x: 0.7, y: 3.75, w: 5, h: 0.3, fontSize: 13, bold: true, color: GOLD, charSpacing: 2, objectName: "a2-fade" }));
    const prac = ["Using the cash register", "Serving customers", "Organising documents", "Understanding basic accounting"];
    s.addText(prac.map((p, i) => ({ text: p, options: { bullet: { indent: 18 }, breakLine: i < prac.length - 1 } })),
      T({ x: 0.7, y: 4.15, w: 5.4, h: 2.2, fontSize: 18, color: NAVY, paraSpaceAfter: 10, objectName: "a2-fade" }));

    const skills = [
      [fa.FaComments, "Communi-\ncation"],
      [fa.FaPeopleGroup, "Teamwork"],
      [fa.FaUserCheck, "Responsi-\nbility"],
      [fa.FaClock, "Time\nmanagement"],
      [fa.FaPuzzlePiece, "Problem\nsolving"],
      [fa.FaListCheck, "Organisation"],
    ];
    const hw = 2.1, hh = 1.82, hstep = 0.75 * hw + 0.1, vstep = hh + 0.1;
    const x0 = 12.63 - (2 * hstep + hw), y0 = 1.95;
    const pos = [[0, 0], [1, 0.5], [2, 0], [0, 1], [1, 1.5], [2, 1]];
    for (let i = 0; i < 6; i++) {
      const [ic, lab] = skills[i];
      const x = x0 + pos[i][0] * hstep, y = y0 + pos[i][1] * vstep;
      const fill = i % 2 === 0 ? NAVY : GOLD;
      const n = `a${i + 3}-zoom`;
      s.addShape("hexagon", { x, y, w: hw, h: hh, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: n });
      s.addImage({ data: await icon(ic, WHITE), x: x + hw / 2 - 0.25, y: y + 0.36, w: 0.5, h: 0.5, objectName: n });
      s.addText(lab.replace("-\n", ""), T({ x: x + 0.2, y: y + 0.93, w: hw - 0.4, h: 0.7, fontSize: 14, bold: true, color: WHITE, align: "center", objectName: n }));
    }
    footer(s, 9);
    s.addNotes(
      "This internship helped me grow, at work and as a person. " +
      "I learned practical skills: using the cash register, serving customers, organising documents, and understanding basic accounting. " +
      "I also developed soft skills: communication, teamwork, responsibility, time management, problem solving and organisation."
    );
  }

  // =====================================================================
  // 10. EVALUATION
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "My results", "My evaluation from the company");
    s.addShape("roundRect", { x: 0.7, y: 1.95, w: 4.1, h: 4.75, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.18, objectName: "a1-zoom" });
    s.addText("FINAL GRADE", T({ x: 0.7, y: 2.35, w: 4.1, h: 0.3, fontSize: 13, bold: true, color: GOLD_SOFT, charSpacing: 3, align: "center", objectName: "a1-zoom" }));
    s.addText("10/10", T({ x: 0.7, y: 2.8, w: 4.1, h: 1.4, fontSize: 88, bold: true, fontFace: HEAD, color: GOLD, align: "center", valign: "middle", objectName: "a2-zoom" }));
    const star = await icon(fa.FaStar, GOLD);
    for (let i = 0; i < 5; i++) s.addImage({ data: star, x: 1.5 + i * 0.52, y: 4.4, w: 0.38, h: 0.38, objectName: "a3-fade" });
    s.addText([
      { text: "10 (Dix) – Excellent", options: { fontSize: 19, bold: true, color: WHITE, breakLine: true } },
      { text: "The top grade in all 8 criteria", options: { fontSize: 15, color: LIGHT } },
    ], T({ x: 0.9, y: 5.1, w: 3.7, h: 1.0, align: "center", paraSpaceAfter: 4, objectName: "a3-fade" }));

    const crit = [
      "Presents the company's activities",
      "Knows the company's legal documents",
      "Analyses planning and management",
      "Uses information technologies (ICT)",
      "Knows communication styles & channels",
      "Speaks a foreign language at work",
      "Brings new ideas into the company",
      "Suggests ways to improve performance",
    ];
    crit.forEach((c, i) => {
      const y = 2.0 + i * 0.585;
      const n = `a${i + 4}-wipe`;
      s.addText(c, T({ x: 5.3, y, w: 4.25, h: 0.42, fontSize: 15, valign: "middle", objectName: n }));
      s.addShape("roundRect", { x: 9.7, y: y + 0.1, w: 2.3, h: 0.22, fill: { color: TINT }, line: { color: TINT, width: 0 }, rectRadius: 0.11 });
      s.addShape("roundRect", { x: 9.7, y: y + 0.1, w: 2.3, h: 0.22, fill: { color: GOLD }, line: { color: GOLD, width: 0 }, rectRadius: 0.11, objectName: n });
      s.addText("10", T({ x: 12.13, y, w: 0.5, h: 0.42, fontSize: 16, bold: true, align: "right", valign: "middle", objectName: n }));
    });
    footer(s, 10);
    s.addNotes(
      "At the end of the internship, my supervisor evaluated my work with eight criteria. " +
      "For example: presenting the company's activities, knowing its legal documents, analysing planning and management, " +
      "using information technologies, communication, speaking a foreign language, bringing new ideas, and suggesting improvements. " +
      "I received 10 out of 10 in every criterion. My final grade is 10, excellent. I am very proud of this result."
    );
  }

  // =====================================================================
  // 11. SUPERVISOR FEEDBACK
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "Feedback", "What my supervisor said");
    s.addShape("roundRect", { x: 0.7, y: 1.95, w: 7.3, h: 4.2, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.18, objectName: "a1-float" });
    s.addImage({ data: await icon(fa.FaQuoteLeft, GOLD), x: 1.15, y: 2.35, w: 0.75, h: 0.75, objectName: "a1-float" });
    s.addText("The trainee performed his assigned duties responsibly and showed good communication and teamwork skills. He adapted well to the work environment.",
      T({ x: 1.15, y: 3.25, w: 6.4, h: 2.0, fontSize: 22, italic: true, fontFace: HEAD, color: WHITE, objectName: "a1-float" }));
    s.addText("Traineeship certificate", T({ x: 1.15, y: 5.45, w: 6.4, h: 0.35, fontSize: 13, bold: true, color: GOLD_SOFT, charSpacing: 1, objectName: "a1-float" }));

    s.addShape("roundRect", { x: 8.3, y: 1.95, w: 4.33, h: 4.2, fill: { color: GOLD_TINT }, line: { color: GOLD_TINT, width: 0 }, rectRadius: 0.18, objectName: "a2-float" });
    s.addImage({ data: await icon(fa.FaQuoteLeft, GOLD), x: 8.75, y: 2.35, w: 0.75, h: 0.75, objectName: "a2-float" });
    s.addText("It was a pleasure having the trainee as part of our team.",
      T({ x: 8.75, y: 3.25, w: 3.5, h: 2.0, fontSize: 22, italic: true, fontFace: HEAD, color: NAVY, objectName: "a2-float" }));
    s.addText("Evaluation form", T({ x: 8.75, y: 5.45, w: 3.5, h: 0.35, fontSize: 13, bold: true, color: GOLD, charSpacing: 1, objectName: "a2-float" }));

    s.addText([
      { text: "Mr. Djamel Ounnadi", options: { bold: true, color: NAVY } },
      { text: "   ·   Director, Boulangerie D.O", options: { color: MUTED } },
    ], T({ x: 0.7, y: 6.35, w: 11.93, h: 0.4, fontSize: 16, objectName: "a3-fade" }));
    footer(s, 11);
    s.addNotes(
      "Here is the feedback from my supervisor, Mr. Djamel Ounnadi. " +
      "In my traineeship certificate he wrote that I did my duties responsibly, that I showed good communication and teamwork skills, " +
      "and that I adapted well to the work environment. " +
      "In the evaluation form he wrote: it was a pleasure having the trainee as part of our team. " +
      "This feedback means a lot to me."
    );
  }

  // =====================================================================
  // 12. CONCLUSION
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { color: WHITE };
    header(s, "Conclusion", "What this internship gave me");
    const cols = [
      ["01", "Real work experience", "I worked in a real French business and saw how it works every day."],
      ["02", "Stronger skills", "Better communication, teamwork and customer service."],
      ["03", "More confidence", "I feel ready to use these skills in my studies and my future job."],
    ];
    cols.forEach(([num, t, d], i) => {
      const x = 0.7 + i * 4.08;
      const n = `a${i + 1}-float`;
      s.addText(num, T({ x, y: 1.95, w: 3.6, h: 0.95, fontSize: 60, bold: true, fontFace: HEAD, color: GOLD, objectName: n }));
      s.addText(t, T({ x, y: 3.0, w: 3.6, h: 0.5, fontSize: 23, bold: true, fontFace: HEAD, objectName: n }));
      s.addText(d, T({ x, y: 3.55, w: 3.5, h: 1.3, fontSize: 17, color: MUTED, objectName: n }));
    });
    s.addShape("roundRect", { x: 0.7, y: 5.3, w: 11.93, h: 1.2, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.15, objectName: "a4-wipe" });
    s.addImage({ data: await icon(fa.FaGraduationCap, GOLD), x: 1.15, y: 5.5, w: 0.8, h: 0.8, objectName: "a4-wipe" });
    s.addText([
      { text: "Theory from university  +  practice in France  =  ", options: { color: WHITE } },
      { text: "real learning", options: { color: GOLD_SOFT, bold: true } },
    ], T({ x: 2.25, y: 5.3, w: 10.1, h: 1.2, fontSize: 22, fontFace: HEAD, valign: "middle", objectName: "a4-wipe" }));
    footer(s, 12);
    s.addNotes(
      "To conclude, this internship gave me three important things. " +
      "First, real work experience in a French business. " +
      "Second, stronger skills: communication, teamwork and customer service. " +
      "Third, more confidence for my studies and my future job. " +
      "For me, theory from university plus practice in France equals real learning."
    );
  }

  // =====================================================================
  // 13. THANK YOU
  // =====================================================================
  {
    const s = pres.addSlide();
    s.background = { path: bgEnd };
    [FR_BLUE, WHITE, FR_RED].forEach((c, i) =>
      s.addShape("ellipse", { x: W / 2 - 0.4 + i * 0.3, y: 1.35, w: 0.2, h: 0.2, fill: { color: c }, line: { color: c, width: 0 }, objectName: "a1-fade" })
    );
    s.addImage({ data: await icon(gi.GiCroissant, GOLD, 512), x: 2.6, y: 2.05, w: 1.3, h: 1.3, objectName: "a2-zoom" });
    s.addImage({ data: await icon(tb.TbBuildingEiffelTower, GOLD, 512), x: W - 3.9, y: 2.05, w: 1.3, h: 1.3, objectName: "a2-zoom" });
    s.addText("Merci !", T({ x: 3.9, y: 1.8, w: W - 7.8, h: 1.8, fontSize: 80, bold: true, fontFace: HEAD, color: GOLD, align: "center", valign: "middle", objectName: "a2-zoom" }));
    s.addText("Thank you for your attention", T({ x: 1.5, y: 3.75, w: W - 3, h: 0.7, fontSize: 30, color: WHITE, fontFace: HEAD, align: "center", objectName: "a3-float" }));
    s.addText("Questions?", T({ shape: "roundRect", x: W / 2 - 1.5, y: 4.75, w: 3.0, h: 0.75, rectRadius: 0.37, fill: { type: "none" }, line: { color: GOLD, width: 2 }, fontSize: 22, bold: true, color: GOLD_SOFT, align: "center", valign: "middle", objectName: "a4-zoom" }));
    s.addText("Djoudi Mohamed Salah E  ·  Boulangerie D.O, Creil  ·  Erasmus+ 2025/2026", T({ x: 1.5, y: 6.35, w: W - 3, h: 0.4, fontSize: 14, color: LIGHT, align: "center", objectName: "a5-fade" }));
    s.addNotes("Thank you very much for your attention. Merci! I am happy to answer your questions.");
  }

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})();

// Builds the internship defense deck (static layout).
// Structure follows the Erasmus+ Learning Agreement (before -> during -> after)
// and covers all 8 criteria of the Practice Evaluation Form.
// Animations + transitions are added afterwards by animate.py, which reads the
// shape names: "a<step>-<effect>" (e.g. "a3-zoom"). Same step = same moment.
const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");
const gi = require("react-icons/gi");
const tb = require("react-icons/tb");

const OUT = process.argv[2] || "raw.pptx";

// ---------- palette & fonts ----------
const NAVY = "1B2A4A";
const NAVY2 = "2A3F68";
const GOLD = "D9973A";
const GOLD_SOFT = "F2C98A";
const TINT = "F3F5F9";
const GOLD_TINT = "FBF1E2";
const MUTED = "5B6577";
const LIGHT = "C9D3E6";
const LINE = "AAB4C5";
const WHITE = "FFFFFF";
const FR_BLUE = "0055A4";
const FR_RED = "EF4135";
const HEAD = "Cambria";
const BODY = "Calibri";

const W = 13.333;
const H = 7.5;
const TOTAL = 20;
const UNI = "Klaipėda State University of Applied Sciences";

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

function footer(slide, n) {
  slide.addText("Djoudi Mohamed Salah E  ·  Erasmus+ internship, France 2026", T({ x: 0.7, y: 7.0, w: 7, h: 0.28, fontSize: 10, color: MUTED }));
  slide.addText(`${n} / ${TOTAL}`, T({ x: 11.63, y: 7.0, w: 1.0, h: 0.28, fontSize: 10, color: MUTED, align: "right" }));
}

// circle with icon (the deck's motif)
async function iconCircle(slide, IconComp, x, y, d, name, fill = GOLD, iconColor = WHITE) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: name });
  const s = d * 0.52;
  slide.addImage({ data: await icon(IconComp, iconColor), x: x + (d - s) / 2, y: y + (d - s) / 2, w: s, h: s, objectName: name });
}

function card(slide, x, y, w, h, name, color = TINT, extra = {}) {
  slide.addShape("roundRect", Object.assign({ x, y, w, h, fill: { color }, line: { color, width: 0 }, rectRadius: 0.15, objectName: name }, extra));
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.author = "Djoudi Mohamed Salah E";
  pres.title = "My Internship in France – Boulangerie D.O";

  const bgTitle = await bgImage("bg_title.png", "0.72", "0.45");
  const bgEnd = await bgImage("bg_end.png", "0.5", "0.4");
  let n = 0;

  // =====================================================================
  // 1. TITLE
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { path: bgTitle };
    [FR_BLUE, WHITE, FR_RED].forEach((c, i) =>
      s.addShape("ellipse", { x: 0.75 + i * 0.3, y: 1.33, w: 0.2, h: 0.2, fill: { color: c }, line: { color: c, width: 0 }, objectName: "a1-fade" })
    );
    s.addText("ERASMUS+ INTERNSHIP  ·  DEFENSE", T({ x: 1.75, y: 1.23, w: 6, h: 0.4, fontSize: 14, bold: true, color: GOLD, charSpacing: 4, valign: "middle", objectName: "a1-fade" }));
    s.addText("My Internship\nin France", T({ x: 0.75, y: 1.8, w: 7.2, h: 2.0, fontSize: 54, bold: true, fontFace: HEAD, color: WHITE, valign: "middle", objectName: "a2-float" }));
    s.addText("Boulangerie D.O  ·  Creil", T({ x: 0.75, y: 3.9, w: 7, h: 0.55, fontSize: 26, color: GOLD_SOFT, fontFace: HEAD, italic: true, objectName: "a3-float" }));
    s.addText([
      { text: "Djoudi Mohamed Salah E", options: { fontSize: 20, bold: true, color: WHITE, breakLine: true } },
      { text: UNI, options: { fontSize: 15, color: LIGHT, breakLine: true } },
      { text: "Management of Organisations  |  Academic year 2025/2026", options: { fontSize: 15, color: LIGHT } },
    ], T({ x: 0.75, y: 4.95, w: 7.2, h: 1.3, paraSpaceAfter: 4, objectName: "a4-fade" }));

    s.addShape("ellipse", { x: 7.8, y: 1.15, w: 5.2, h: 5.2, fill: { type: "none" }, line: { color: GOLD, width: 1.5, transparency: 50 }, objectName: "a1-zoom" });
    s.addShape("ellipse", { x: 8.1, y: 1.45, w: 4.6, h: 4.6, fill: { color: GOLD }, line: { color: GOLD, width: 0 }, objectName: "a1-zoom" });
    s.addImage({ data: await icon(gi.GiCroissant, NAVY, 512), x: 8.95, y: 2.3, w: 2.9, h: 2.9, objectName: "a2-zoom" });

    s.addNotes(
      "Good morning / Good afternoon. My name is Djoudi Mohamed Salah E. " +
      "I study Management of Organisations at Klaipėda State University of Applied Sciences. " +
      "Today I will present my Erasmus+ internship at Boulangerie D.O, a bakery in Creil, France."
    );
  }

  // =====================================================================
  // 2. AGENDA
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    s.addShape("rect", { x: 0, y: 0, w: 4.6, h: H, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    s.addText("TODAY", T({ x: 0.7, y: 2.2, w: 3.5, h: 0.3, fontSize: 13, bold: true, color: GOLD, charSpacing: 3 }));
    s.addText("What I will\ntalk about", T({ x: 0.7, y: 2.6, w: 3.6, h: 1.6, fontSize: 40, bold: true, fontFace: HEAD, color: WHITE }));
    s.addImage({ data: await icon(tb.TbBuildingEiffelTower, GOLD, 512), x: 0.7, y: 4.55, w: 1.3, h: 1.3, objectName: "a1-zoom" });

    const items = [
      ["About me & my internship", "Who I am, where, when and why"],
      ["The company", "Activities, structure and rules"],
      ["Management in practice", "How the bakery is managed"],
      ["My work", "Tasks, tools, communication and customers"],
      ["Ideas & results", "My improvement ideas and my evaluation"],
      ["Conclusion", "What this experience gave me"],
    ];
    items.forEach(([t, d], i) => {
      const y = 0.8 + i * 1.03;
      const nm = `a${i + 2}-float`;
      s.addText(String(i + 1).padStart(2, "0"), T({ shape: "ellipse", x: 5.4, y, w: 0.72, h: 0.72, fill: { color: GOLD }, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: HEAD, objectName: nm }));
      s.addText(t, T({ x: 6.45, y: y - 0.02, w: 6.2, h: 0.42, fontSize: 22, bold: true, fontFace: HEAD, objectName: nm }));
      s.addText(d, T({ x: 6.45, y: y + 0.4, w: 6.2, h: 0.32, fontSize: 15, color: MUTED, objectName: nm }));
    });
    s.addText(`${n} / ${TOTAL}`, T({ x: 11.63, y: 7.0, w: 1.0, h: 0.28, fontSize: 10, color: MUTED, align: "right" }));
    s.addNotes(
      "My presentation has six parts. " +
      "First, I will talk about me and my internship. Second, the company: its activities, structure and rules. " +
      "Third, how the bakery is managed. Fourth, my work: tasks, tools, communication and customers. " +
      "Fifth, my ideas and my results. And at the end, my conclusion."
    );
  }

  // =====================================================================
  // 3. ABOUT ME (route Algeria -> Lithuania -> France)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "01 · About me", "Who am I?");
    const stops = [
      [fa.FaHouse, "Algeria", "My home country"],
      [fa.FaGraduationCap, "Lithuania", "My studies in Klaipėda"],
      [gi.GiCroissant, "France", "My internship in Creil"],
    ];
    const cxs = [2.4, 6.67, 10.93], cy = 2.85, d = 1.4;
    for (let i = 0; i < 3; i++) {
      const [ic, c, sub] = stops[i];
      const nm = `a${i * 2 + 1}-zoom`;
      await iconCircle(s, ic, cxs[i] - d / 2, cy - d / 2, d, nm, NAVY, GOLD_SOFT);
      s.addText(c, T({ x: cxs[i] - 1.6, y: 3.72, w: 3.2, h: 0.45, fontSize: 22, bold: true, fontFace: HEAD, align: "center", objectName: nm }));
      s.addText(sub, T({ x: cxs[i] - 1.6, y: 4.17, w: 3.2, h: 0.35, fontSize: 15, color: MUTED, align: "center", objectName: nm }));
      if (i < 2) {
        s.addShape("line", { x: cxs[i] + d / 2 + 0.25, y: cy, w: cxs[i + 1] - cxs[i] - d - 0.5, h: 0, line: { color: GOLD, width: 2.5, dashType: "dash", endArrowType: "triangle" }, objectName: `a${i * 2 + 2}-wipe` });
      }
    }
    const tiles = [
      ["UNIVERSITY", UNI],
      ["STUDY PROGRAMME", "Management of Organisations (Bachelor)"],
      ["ENGLISH LEVEL", "C1 – advanced"],
    ];
    tiles.forEach(([lab, val], i) => {
      const x = 0.7 + i * 4.08, y = 4.95;
      const nm = `a${i + 6}-float`;
      card(s, x, y, 3.78, 1.5, nm);
      s.addText(lab, T({ x: x + 0.35, y: y + 0.22, w: 3.1, h: 0.28, fontSize: 12, bold: true, color: GOLD, charSpacing: 2, objectName: nm }));
      s.addText(val, T({ x: x + 0.35, y: y + 0.55, w: 3.1, h: 0.75, fontSize: 17, bold: true, objectName: nm }));
    });
    footer(s, n);
    s.addNotes(
      "A few words about me. I am from Algeria. I study in Lithuania, at Klaipėda State University of Applied Sciences, " +
      "in the Management of Organisations bachelor programme. My English level is C1. " +
      "With the Erasmus+ programme, I did my internship in France. So this internship connected three countries in my life."
    );
  }

  // =====================================================================
  // 4. WHERE (map + facts)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "01 · My internship", "Where I did my internship");
    const mx = 0.8, my = 1.95, ms = 4.5;
    s.addImage({ data: await icon(gi.GiFrance, "D5DDEA", 512), x: mx, y: my, w: ms, h: ms, objectName: "a1-zoom" });
    const cx = mx + (278 / 512) * ms, cy = my + (113 / 512) * ms; // Creil
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
      [fa.FaFolderOpen, "MY DEPARTMENT", "Management"],
      [fa.FaUserTie, "SUPERVISOR & MENTOR", "Djamel Ounnadi, Director"],
    ];
    for (let i = 0; i < facts.length; i++) {
      const [ic, lab, val] = facts[i];
      const y = 2.0 + i * 1.15;
      const nm = `a${i + 4}-float`;
      await iconCircle(s, ic, 6.1, y, 0.82, nm);
      s.addText(lab, T({ x: 7.2, y: y + 0.03, w: 5.4, h: 0.28, fontSize: 12, bold: true, color: GOLD, charSpacing: 2, objectName: nm }));
      s.addText(val, T({ x: 7.2, y: y + 0.33, w: 5.4, h: 0.45, fontSize: 19, bold: true, objectName: nm }));
    }
    footer(s, n);
    s.addNotes(
      "I did my internship in Creil, a city about 50 kilometres north of Paris. " +
      "The company is Boulangerie D.O, a bakery at 59 Rue Gambetta. " +
      "I worked in the management department. " +
      "My supervisor and mentor was Djamel Ounnadi, the director of the bakery."
    );
  }

  // =====================================================================
  // 5. BEFORE -> DURING -> AFTER
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "01 · How it was organised", "Before, during and after my internship");
    const phases = [
      ["homePlate", NAVY, "1   BEFORE", "May 2026", [
        "Learning Agreement signed by me, my university and the company",
        "Plan of my tasks and learning outcomes",
      ]],
      ["chevron", NAVY2, "2   DURING", "5 June – 25 August 2026", [
        "About 12 weeks, 40 hours per week",
        "My supervisor followed my progress and gave me feedback",
        "Meals provided by the company",
      ]],
      ["chevron", GOLD, "3   AFTER", "End of the internship", [
        "Traineeship certificate from the company",
        "Evaluation form: 10/10",
        "15 ECTS credits for my studies",
      ]],
    ];
    const px = [0.7, 4.62, 8.54];
    phases.forEach(([shape, col, lab, date, bullets], i) => {
      const nm = `a${i + 1}-float`;
      s.addText(lab, T({ shape, x: px[i], y: 1.95, w: 4.09, h: 0.85, fill: { color: col }, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle", charSpacing: 2, objectName: nm }));
      const cxp = 0.7 + i * 4.04;
      card(s, cxp, 3.05, 3.85, 3.45, nm);
      s.addText(date, T({ x: cxp + 0.3, y: 3.3, w: 3.25, h: 0.4, fontSize: 17, bold: true, color: GOLD, fontFace: HEAD, objectName: nm }));
      s.addText(bullets.map((b, k) => ({ text: b, options: { bullet: { indent: 16 }, breakLine: k < bullets.length - 1 } })),
        T({ x: cxp + 0.3, y: 3.9, w: 3.3, h: 2.45, fontSize: 17, color: NAVY, paraSpaceAfter: 14, objectName: nm }));
    });
    footer(s, n);
    s.addNotes(
      "My internship followed the Erasmus+ steps. " +
      "Before: in May 2026, I signed the Learning Agreement with my university and the company. It described my tasks and my learning outcomes. " +
      "During: I worked from 5 June to 25 August 2026, about 12 weeks, 40 hours per week. My supervisor followed my progress and gave me feedback. The company also gave me meals. " +
      "After: the company gave me a traineeship certificate and an evaluation of 10 out of 10. The internship gives me 15 ECTS credits for my studies."
    );
  }

  // =====================================================================
  // 6. AIM & OBJECTIVES
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "01 · Aim & objectives", "What was my internship about?");
    s.addShape("roundRect", { x: 0.7, y: 1.9, w: 11.93, h: 1.15, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.15, objectName: "a1-wipe" });
    s.addText("OFFICIAL TITLE OF MY INTERNSHIP", T({ x: 1.1, y: 2.05, w: 11, h: 0.28, fontSize: 12, bold: true, color: GOLD, charSpacing: 2, objectName: "a1-wipe" }));
    s.addText("Administrative Skills Training and Customer Relationship Management", T({ x: 1.1, y: 2.37, w: 11.2, h: 0.55, fontSize: 23, italic: true, fontFace: HEAD, color: WHITE, objectName: "a1-wipe" }));

    card(s, 0.7, 3.35, 4.7, 3.1, "a2-zoom", GOLD_TINT);
    await iconCircle(s, fa.FaBullseye, 1.1, 3.72, 0.8, "a2-zoom");
    s.addText("MY AIM", T({ x: 2.1, y: 3.72, w: 3, h: 0.8, fontSize: 14, bold: true, color: GOLD, charSpacing: 2, valign: "middle", objectName: "a2-zoom" }));
    s.addText("To learn how a real company is managed and how it takes care of its customers.",
      T({ x: 1.1, y: 4.75, w: 3.9, h: 1.5, fontSize: 20, bold: true, fontFace: HEAD, objectName: "a2-zoom" }));

    s.addText("MY OBJECTIVES", T({ x: 5.85, y: 3.4, w: 6, h: 0.3, fontSize: 14, bold: true, color: GOLD, charSpacing: 2, objectName: "a3-fade" }));
    const obj = [
      "Analyse the company: activities, structure and rules",
      "Prepare and manage documents and information",
      "Take part in work organisation and planning",
      "Understand customers and use CRM",
      "Propose ideas to improve the company",
    ];
    obj.forEach((o, i) => {
      const y = 3.85 + i * 0.52;
      const nm = `a${i + 4}-float`;
      s.addText(String(i + 1), T({ shape: "ellipse", x: 5.85, y, w: 0.4, h: 0.4, fill: { color: NAVY }, fontSize: 13, bold: true, color: WHITE, align: "center", valign: "middle", objectName: nm }));
      s.addText(o, T({ x: 6.45, y, w: 6.2, h: 0.4, fontSize: 17, valign: "middle", objectName: nm }));
    });
    footer(s, n);
    s.addNotes(
      "The official title of my internship was: Administrative Skills Training and Customer Relationship Management. " +
      "My aim was to learn how a real company is managed and how it takes care of its customers. " +
      "I had five objectives: analyse the company, manage documents and information, take part in work organisation, " +
      "understand customers and CRM, and propose ideas to improve the company."
    );
  }

  // =====================================================================
  // 7. THE COMPANY & ITS ACTIVITIES (criterion 1)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "02 · The company", "Boulangerie D.O – a French bakery");
    s.addText("A local bakery in Creil. It makes fresh bread, pastries and cakes and sells them in its shop.",
      T({ x: 0.7, y: 1.8, w: 11.9, h: 0.45, fontSize: 19, color: MUTED, objectName: "a1-fade" }));
    ["Small business (SME)", "SIREN 903 956 977", "Sector: bakery & pastry"].forEach((c, i) =>
      s.addText(c, T({ shape: "roundRect", x: 0.7 + i * 2.95, y: 2.4, w: 2.75, h: 0.42, rectRadius: 0.21, fill: { color: TINT }, fontSize: 13, bold: true, align: "center", valign: "middle", objectName: "a1-fade" }))
    );
    const steps = [
      [fa.FaCalendarCheck, "Plan", "The director plans the day and the team."],
      [gi.GiCroissant, "Make", "The pastry chef bakes fresh products."],
      [fa.FaCashRegister, "Sell", "The shop team serves customers and takes payments."],
      [fa.FaCalculator, "Count", "Sales and costs go to accounting."],
      [fa.FaLightbulb, "Improve", "We check the results and find better ways."],
    ];
    const cxs = steps.map((_, i) => 1.75 + i * (9.83 / 4));
    const cyLine = 4.05;
    s.addShape("line", { x: cxs[0], y: cyLine, w: cxs[4] - cxs[0], h: 0, line: { color: GOLD, width: 3 }, objectName: "a2-wipe" });
    for (let i = 0; i < 5; i++) {
      const [ic, t, d] = steps[i];
      const cx = cxs[i];
      const nm = `a${i + 3}-zoom`;
      await iconCircle(s, ic, cx - 0.65, cyLine - 0.65, 1.3, nm, NAVY, GOLD_SOFT);
      s.addText(String(i + 1), T({ shape: "ellipse", x: cx + 0.26, y: cyLine - 0.8, w: 0.44, h: 0.44, fill: { color: GOLD }, line: { color: WHITE, width: 2 }, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle", objectName: nm }));
      s.addText(t, T({ x: cx - 1.15, y: 4.9, w: 2.3, h: 0.45, fontSize: 20, bold: true, fontFace: HEAD, align: "center", objectName: nm }));
      s.addText(d, T({ x: cx - 1.1, y: 5.37, w: 2.2, h: 1.0, fontSize: 14, color: MUTED, align: "center", objectName: nm }));
    }
    footer(s, n);
    s.addNotes(
      "Boulangerie D.O is a small local bakery in Creil. It is a registered French company, SIREN number 903 956 977. " +
      "It makes fresh bread, pastries and cakes and sells them in its shop. " +
      "The work goes in five steps: the director plans the day, the pastry chef makes the products, the shop team sells them, " +
      "sales and costs go to accounting, and then we check the results to improve. I took part in each of these steps."
    );
  }

  // =====================================================================
  // 8. ORGANISATIONAL STRUCTURE (criterion 1 / 3)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "02 · Structure", "How the bakery is organised");
    s.addShape("roundRect", { x: 4.92, y: 1.95, w: 3.5, h: 0.95, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.12, objectName: "a1-zoom" });
    s.addImage({ data: await icon(fa.FaUserTie, GOLD_SOFT), x: 5.2, y: 2.18, w: 0.5, h: 0.5, objectName: "a1-zoom" });
    s.addText([
      { text: "Director", options: { fontSize: 18, bold: true, color: WHITE, fontFace: HEAD, breakLine: true } },
      { text: "Djamel Ounnadi", options: { fontSize: 13, color: LIGHT } },
    ], T({ x: 5.9, y: 1.95, w: 2.4, h: 0.95, valign: "middle", objectName: "a1-zoom" }));
    s.addShape("line", { x: 8.42, y: 2.42, w: 0.95, h: 0, line: { color: GOLD, width: 1.75, dashType: "dash" }, objectName: "a2-fade" });
    s.addShape("roundRect", { x: 9.37, y: 2.0, w: 3.26, h: 0.85, fill: { color: GOLD_TINT }, line: { color: GOLD, width: 1.25, dashType: "dash" }, rectRadius: 0.12, objectName: "a2-fade" });
    s.addImage({ data: await icon(fa.FaUserGraduate, GOLD), x: 9.6, y: 2.2, w: 0.45, h: 0.45, objectName: "a2-fade" });
    s.addText([
      { text: "Me – trainee", options: { fontSize: 15, bold: true, breakLine: true } },
      { text: "I helped in all three areas", options: { fontSize: 12, color: MUTED } },
    ], T({ x: 10.2, y: 2.0, w: 2.35, h: 0.85, valign: "middle", objectName: "a2-fade" }));
    const cxs = [2.55, 6.67, 10.78];
    s.addShape("line", { x: 6.67, y: 2.9, w: 0, h: 0.45, line: { color: LINE, width: 1.5 }, objectName: "a3-fade" });
    s.addShape("line", { x: cxs[0], y: 3.35, w: cxs[2] - cxs[0], h: 0, line: { color: LINE, width: 1.5 }, objectName: "a3-fade" });
    cxs.forEach((c) => s.addShape("line", { x: c, y: 3.35, w: 0, h: 0.4, line: { color: LINE, width: 1.5 }, objectName: "a3-fade" }));
    const units = [
      [gi.GiCroissant, "Production", "Pastry chef: bread, pastries and cakes"],
      [fa.FaStore, "Sales", "Shop team: customers and cash register"],
      [fa.FaFolderOpen, "Administration", "Documents, planning and accounting"],
    ];
    for (let i = 0; i < 3; i++) {
      const [ic, t, d] = units[i];
      const x = cxs[i] - 1.75, y = 3.75;
      const nm = `a${i + 4}-zoom`;
      card(s, x, y, 3.5, 1.75, nm);
      await iconCircle(s, ic, x + 0.3, y + 0.3, 0.72, nm);
      s.addText(t, T({ x: x + 1.2, y: y + 0.3, w: 2.2, h: 0.72, fontSize: 19, bold: true, fontFace: HEAD, valign: "middle", objectName: nm }));
      s.addText(d, T({ x: x + 0.3, y: y + 1.12, w: 2.95, h: 0.55, fontSize: 14, color: MUTED, objectName: nm }));
    }
    s.addText([
      { text: "Simple structure: ", options: { bold: true, color: GOLD } },
      { text: "few levels, so decisions are quick and communication is direct.", options: { color: NAVY } },
    ], T({ shape: "roundRect", x: 0.8, y: 5.85, w: 11.73, h: 0.7, rectRadius: 0.12, fill: { color: GOLD_TINT }, fontSize: 17, align: "center", valign: "middle", objectName: "a7-fade" }));
    footer(s, n);
    s.addNotes(
      "This is the structure of the bakery. At the top is the director, Djamel Ounnadi. " +
      "Under the director there are three areas: production with the pastry chef, sales with the shop team, and administration with documents, planning and accounting. " +
      "As a trainee I worked directly with the director and I helped in all three areas. " +
      "It is a simple structure with few levels, so decisions are quick and communication is direct."
    );
  }

  // =====================================================================
  // 9. RULES & DOCUMENTS (criterion 2)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "02 · Rules & documents", "Rules the bakery must follow");
    const rules = [
      [fa.FaBuilding, "Company registration", "Registered French business – SIREN 903 956 977."],
      [fa.FaFileContract, "Labour law", "French Labour Code and the bakery collective agreement: contracts, hours, rest."],
      [fa.FaShieldHalved, "Food hygiene (HACCP)", "EU hygiene rules: clean work, right temperatures, product tracking."],
      [fa.FaTags, "Prices & allergens", "Prices must be shown. Allergens must be listed for customers."],
      [fa.FaLock, "Data protection (GDPR)", "Customer data must be kept safe and private."],
      [gi.GiSlicedBread, "The name “Boulangerie”", "French law (1998): only bakers who make the bread on site can use this name."],
    ];
    for (let i = 0; i < 6; i++) {
      const [ic, t, d] = rules[i];
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.7 + col * 6.18, y = 1.95 + row * 1.55;
      const nm = `a${i + 1}-float`;
      card(s, x, y, 5.75, 1.35, nm);
      await iconCircle(s, ic, x + 0.3, y + 0.28, 0.8, nm);
      s.addText(t, T({ x: x + 1.35, y: y + 0.2, w: 4.2, h: 0.4, fontSize: 18, bold: true, fontFace: HEAD, objectName: nm }));
      s.addText(d, T({ x: x + 1.35, y: y + 0.62, w: 4.2, h: 0.65, fontSize: 14, color: MUTED, objectName: nm }));
    }
    footer(s, n);
    s.addNotes(
      "A bakery in France must follow many rules. Here are the main ones. " +
      "First, the company is registered, with a SIREN number. " +
      "Second, labour law: the French Labour Code and the bakery collective agreement, for contracts, working hours and rest. " +
      "Third, food hygiene: the EU hygiene rules and HACCP, for clean work, right temperatures and product tracking. " +
      "Fourth, prices must be shown and allergens must be listed. " +
      "Fifth, GDPR: customer data must be kept safe. " +
      "And a fun fact: in France, only bakers who make the bread on site can use the name boulangerie."
    );
  }

  // =====================================================================
  // 10. MANAGEMENT FUNCTIONS (criterion 3)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "03 · Management in practice", "Management functions at the bakery");
    const fns = [
      [fa.FaCalendarCheck, "Planning", ["Daily production plan", "Staff work schedule", "Ordering ingredients"]],
      [fa.FaSitemap, "Organising", ["A clear role for each person", "Tasks split: production, sales, admin", "Work in shifts"]],
      [fa.FaHandsClapping, "Motivation", ["Direct support from the director", "Regular feedback", "Good team spirit"]],
      [fa.FaClipboardCheck, "Control", ["Daily sales and cash check", "Quality and freshness of products", "Hygiene checks"]],
    ];
    for (let i = 0; i < 4; i++) {
      const [ic, t, bl] = fns[i];
      const x = 0.7 + i * 3.05, y = 1.95;
      const nm = `a${i + 1}-zoom`;
      card(s, x, y, 2.78, 3.75, nm, i % 2 === 0 ? TINT : GOLD_TINT);
      await iconCircle(s, ic, x + 0.3, y + 0.35, 0.95, nm, i % 2 === 0 ? GOLD : NAVY);
      s.addText(`${i + 1}. ${t}`, T({ x: x + 0.3, y: y + 1.5, w: 2.3, h: 0.45, fontSize: 20, bold: true, fontFace: HEAD, objectName: nm }));
      s.addText(bl.map((b, k) => ({ text: b, options: { bullet: { indent: 14 }, breakLine: k < bl.length - 1 } })),
        T({ x: x + 0.3, y: y + 2.05, w: 2.3, h: 1.6, fontSize: 15, paraSpaceAfter: 6, objectName: nm }));
    }
    s.addText([
      { text: "In a small business, ", options: { bold: true, color: GOLD } },
      { text: "the director leads all four functions directly, every day.", options: { color: NAVY } },
    ], T({ shape: "roundRect", x: 0.7, y: 5.92, w: 11.93, h: 0.65, rectRadius: 0.12, fill: { color: GOLD_TINT }, fontSize: 17, align: "center", valign: "middle", objectName: "a5-fade" }));
    footer(s, n);
    s.addNotes(
      "In the bakery I could see the four management functions in practice. " +
      "Planning: the daily production plan, the staff schedule and ordering ingredients. " +
      "Organising: each person has a clear role, and tasks are split between production, sales and administration. " +
      "Motivation: the director gives direct support and regular feedback, and there is a good team spirit. " +
      "Control: every day we check sales and cash, the quality and freshness of products, and hygiene. " +
      "In a small business like this, the director leads all four functions directly."
    );
  }

  // =====================================================================
  // 11. MY TASKS
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "04 · My tasks", "What I did at the bakery");
    const tasks = [
      [fa.FaCashRegister, "Cashier work", "I worked at the cash register and took payments."],
      [fa.FaComments, "Customer service", "I served customers and answered their questions and requests."],
      [gi.GiCroissant, "Helping the pastry chef", "I helped in production and learned how products are made."],
      [fa.FaFolderOpen, "Documents", "I prepared and organised business documents and information."],
      [fa.FaCalendarCheck, "Daily planning", "I helped to plan and coordinate the daily work."],
      [fa.FaCalculator, "Accounting support", "I learned the basic money flows and helped with accounting tasks."],
    ];
    for (let i = 0; i < 6; i++) {
      const [ic, t, d] = tasks[i];
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.7 + col * 4.08, y = 1.95 + row * 2.45, w = 3.78;
      const nm = `a${i + 1}-zoom`;
      card(s, x, y, w, 2.15, nm);
      await iconCircle(s, ic, x + 0.3, y + 0.32, 0.8, nm);
      s.addText(t, T({ x: x + 1.25, y: y + 0.32, w: w - 1.5, h: 0.8, fontSize: 19, bold: true, fontFace: HEAD, valign: "middle", objectName: nm }));
      s.addText(d, T({ x: x + 0.3, y: y + 1.25, w: w - 0.6, h: 0.75, fontSize: 15, color: MUTED, objectName: nm }));
    }
    footer(s, n);
    s.addNotes(
      "Here are my main tasks. " +
      "I worked as a cashier and took payments. I served customers and answered their questions. " +
      "I also helped the pastry chef, so I learned how the products are made. " +
      "On the administrative side, I prepared and organised documents, helped to plan the daily work, " +
      "and I learned the basic money flows by helping with accounting tasks."
    );
  }

  // =====================================================================
  // 12. ICT & COMMUNICATION (criteria 4, 5, 6)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "04 · Tools & communication", "Digital tools and communication");
    card(s, 0.7, 1.95, 5.6, 4.6, "a1-fade");
    s.addText("DIGITAL TOOLS I USED", T({ x: 1.05, y: 2.2, w: 5, h: 0.3, fontSize: 13, bold: true, color: GOLD, charSpacing: 2, objectName: "a1-fade" }));
    const tools = [
      [fa.FaCashRegister, "Cash register (POS system)"],
      [fa.FaCreditCard, "Card payment terminal"],
      [fa.FaEnvelope, "Phone and e-mail"],
      [fa.FaMapLocationDot, "Google business page: map and reviews"],
      [fa.FaLaptop, "Digital documents and tables"],
    ];
    for (let i = 0; i < tools.length; i++) {
      const [ic, t] = tools[i];
      const y = 2.7 + i * 0.75;
      const nm = `a${i + 2}-float`;
      await iconCircle(s, ic, 1.05, y, 0.58, nm);
      s.addText(t, T({ x: 1.85, y, w: 4.3, h: 0.58, fontSize: 16, valign: "middle", objectName: nm }));
    }
    const boxes = [
      [fa.FaComments, "With customers", "face to face, phone, e-mail, online reviews", "polite and formal (French “vous”)", GOLD_TINT, NAVY, MUTED],
      [fa.FaPeopleGroup, "In the team", "daily face-to-face talks, phone", "friendly, clear and direct", NAVY, WHITE, LIGHT],
    ];
    for (let i = 0; i < 2; i++) {
      const [ic, t, ch, st, bg, tc, sc] = boxes[i];
      const y = 1.95 + i * 1.75;
      const nm = `a${i + 7}-zoom`;
      card(s, 6.63, y, 6.0, 1.55, nm, bg);
      s.addImage({ data: await icon(ic, GOLD), x: 6.95, y: y + 0.25, w: 0.42, h: 0.42, objectName: nm });
      s.addText(t, T({ x: 7.5, y: y + 0.22, w: 4.9, h: 0.45, fontSize: 18, bold: true, fontFace: HEAD, color: tc, valign: "middle", objectName: nm }));
      s.addText([
        { text: "Channels: ", options: { bold: true, color: tc } },
        { text: ch, options: { color: sc, breakLine: true } },
        { text: "Style: ", options: { bold: true, color: tc } },
        { text: st, options: { color: sc } },
      ], T({ x: 6.95, y: y + 0.75, w: 5.5, h: 0.7, fontSize: 14.5, objectName: nm }));
    }
    s.addShape("roundRect", { x: 6.63, y: 5.45, w: 6.0, h: 1.1, fill: { color: WHITE }, line: { color: GOLD, width: 1.5 }, rectRadius: 0.15, objectName: "a9-zoom" });
    await iconCircle(s, fa.FaLanguage, 6.95, 5.68, 0.64, "a9-zoom");
    s.addText([
      { text: "Languages at work", options: { bold: true, fontFace: HEAD, fontSize: 17, breakLine: true } },
      { text: "French with customers and the team  ·  English (C1)", options: { color: MUTED, fontSize: 14.5 } },
    ], T({ x: 7.8, y: 5.45, w: 4.7, h: 1.1, valign: "middle", objectName: "a9-zoom" }));
    footer(s, n);
    s.addNotes(
      "In my work I used several digital tools: the cash register, the card payment terminal, phone and e-mail, " +
      "the bakery's Google business page with the map and customer reviews, and digital documents and tables. " +
      "Communication was different with customers and in the team. With customers we talk face to face, by phone, by e-mail and through online reviews, " +
      "and the style is polite and formal: in French we say vous. In the team, communication is face to face, friendly and direct. " +
      "At work I spoke French, and my English level is C1."
    );
  }

  // =====================================================================
  // 13. CUSTOMERS (CRM cycle)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "04 · Customers", "Taking care of customers (CRM)");
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
      const nm = `a${i + 2}-zoom`;
      await iconCircle(s, ic, sx - d / 2, sy - d / 2, d, nm);
      let lab;
      if (lp === "right") lab = { x: sx + 0.65, y: dy < 0 ? sy - 0.35 : sy - 0.05, w: 1.3, h: 0.4, align: "left" };
      else if (lp === "below") lab = { x: sx - 0.05, y: sy + 0.55, w: 1.2, h: 0.4, align: "left" };
      else lab = { x: sx - 1.95, y: sy - 0.2, w: 1.35, h: 0.4, align: "right" };
      s.addText(word, T(Object.assign({ fontSize: 17, bold: true, fontFace: HEAD, objectName: nm }, lab)));
      s.addText([
        { text: `${i + 1}. ${word}  `, options: { bold: true, color: NAVY, fontFace: HEAD, fontSize: 19 } },
        { text: `– ${desc}`, options: { color: MUTED, fontSize: 16 } },
      ], T({ x: 7.0, y: 2.0 + i * 0.92, w: 5.63, h: 0.75, valign: "middle", objectName: nm }));
    }
    s.addText([
      { text: "Main lesson: ", options: { bold: true, color: GOLD } },
      { text: "a happy customer comes back!", options: { bold: true, color: NAVY } },
    ], T({ shape: "roundRect", x: 7.0, y: 5.85, w: 5.63, h: 0.85, rectRadius: 0.12, fill: { color: GOLD_TINT }, fontSize: 18, align: "center", valign: "middle", objectName: "a6-zoom" }));
    footer(s, n);
    s.addNotes(
      "An important part of my internship was customer relationship management, or CRM. " +
      "I learned that good service is a cycle. " +
      "First, listen and understand what the customer needs. Second, help: answer questions and handle requests. " +
      "Third, solve problems quickly and politely. Fourth, keep the customer: good service makes loyal customers. " +
      "The main lesson for me is simple: a happy customer comes back."
    );
  }

  // =====================================================================
  // 14. IMPROVEMENT IDEAS (criteria 7 & 8)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "05 · New ideas", "My ideas to improve the bakery");
    const ideas = [
      [fa.FaIdCard, "Loyalty card", "A stamp card: buy 10 items, get 1 free.", "customers come back more often."],
      [fa.FaMobileScreen, "Pre-orders", "Customers order by phone or online, then pick up.", "less waiting and better planning."],
      [fa.FaChartLine, "Sales tracking", "Record the daily sales of each product in a table.", "bake the right amount, less waste."],
      [fa.FaStar, "Customer reviews", "Ask happy customers for Google reviews and answer them.", "better service and reputation."],
    ];
    for (let i = 0; i < 4; i++) {
      const [ic, t, idea, ben] = ideas[i];
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.7 + col * 6.13, y = 1.95 + row * 2.4;
      const nm = `a${i + 1}-zoom`;
      card(s, x, y, 5.8, 2.15, nm);
      await iconCircle(s, ic, x + 0.3, y + 0.3, 0.8, nm);
      s.addText([
        { text: `IDEA ${i + 1}`, options: { fontSize: 12, bold: true, color: GOLD, charSpacing: 2, breakLine: true } },
        { text: t, options: { fontSize: 20, bold: true, fontFace: HEAD } },
      ], T({ x: x + 1.3, y: y + 0.25, w: 4.2, h: 0.9, valign: "middle", objectName: nm }));
      s.addText(idea, T({ x: x + 0.3, y: y + 1.2, w: 5.2, h: 0.4, fontSize: 15, color: MUTED, objectName: nm }));
      s.addText([
        { text: "Benefit: ", options: { bold: true, color: GOLD } },
        { text: ben, options: { color: NAVY } },
      ], T({ shape: "roundRect", x: x + 0.3, y: y + 1.62, w: 5.2, h: 0.38, rectRadius: 0.19, fill: { color: WHITE }, fontSize: 14, valign: "middle", margin: [0, 10, 0, 10], objectName: nm }));
    }
    footer(s, n);
    s.addNotes(
      "During my internship I collected information and prepared ideas to improve the bakery. " +
      "Idea one: a loyalty card, for example buy ten items and get one free, so customers come back more often. " +
      "Idea two: pre-orders by phone or online, so there is less waiting and better planning. " +
      "Idea three: record the daily sales of each product, so the bakery bakes the right amount and wastes less. " +
      "Idea four: ask happy customers for Google reviews and answer them, for better service and a better reputation."
    );
  }

  // =====================================================================
  // 15. PLAN vs RESULT (Learning Agreement -> Certificate)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "05 · Results", "Plan vs. result: my learning outcomes");
    s.addText("PLANNED  (LEARNING AGREEMENT)", T({ x: 1.4, y: 1.85, w: 5, h: 0.3, fontSize: 12, bold: true, color: GOLD, charSpacing: 2 }));
    s.addText("ACHIEVED  (TRAINEESHIP CERTIFICATE)", T({ x: 7.05, y: 1.85, w: 5, h: 0.3, fontSize: 12, bold: true, color: GOLD, charSpacing: 2 }));
    const rows = [
      ["Analyse the company and manage documents", "Studied the company; organised documents"],
      ["Organise work and manage people", "Helped plan daily work and team tasks"],
      ["Find problems and propose solutions", "Prepared 4 ideas to improve the bakery"],
      ["Use management principles in practice", "Saw the 4 management functions at work"],
      ["Use digital systems for data", "Used POS, card terminal and digital files"],
      ["Analyse customers and apply CRM", "Served customers daily; built loyalty"],
      ["Communicate professionally", "Praised for communication and teamwork"],
    ];
    const arrow = await icon(fa.FaArrowRightLong, LINE);
    const check = await icon(fa.FaCircleCheck, GOLD);
    rows.forEach(([p, a], i) => {
      const y = 2.25 + i * 0.6;
      const nm = `a${i + 1}-wipe`;
      s.addShape("roundRect", { x: 0.7, y, w: 11.93, h: 0.5, fill: { color: i % 2 === 0 ? TINT : WHITE }, line: { color: TINT, width: 0.75 }, rectRadius: 0.1, objectName: nm });
      s.addText(String(i + 1), T({ shape: "ellipse", x: 0.85, y: y + 0.07, w: 0.36, h: 0.36, fill: { color: NAVY }, fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle", objectName: nm }));
      s.addText(p, T({ x: 1.4, y, w: 5.0, h: 0.5, fontSize: 15, bold: true, valign: "middle", objectName: nm }));
      s.addImage({ data: arrow, x: 6.5, y: y + 0.09, w: 0.32, h: 0.32, objectName: nm });
      s.addText(a, T({ x: 7.05, y, w: 4.95, h: 0.5, fontSize: 15, color: MUTED, valign: "middle", objectName: nm }));
      s.addImage({ data: check, x: 12.12, y: y + 0.07, w: 0.36, h: 0.36, objectName: `a${i + 2}-zoom` });
    });
    footer(s, n);
    s.addNotes(
      "Here I compare the plan with the result. On the left are the seven learning outcomes from my Learning Agreement. " +
      "On the right is what I really did, as written in my traineeship certificate. " +
      "I analysed the company and organised documents. I helped to plan the daily work. I prepared ideas to improve the bakery. " +
      "I saw the management functions in practice. I used digital tools. I served customers every day. " +
      "And my supervisor praised my communication and teamwork. So all seven planned outcomes were achieved."
    );
  }

  // =====================================================================
  // 16. SKILLS (honeycomb)
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "05 · Results", "Skills I developed");
    s.addText("This internship helped me grow at work and as a person.",
      T({ x: 0.7, y: 2.3, w: 5.6, h: 1.1, fontSize: 24, bold: true, fontFace: HEAD, objectName: "a1-fade" }));
    s.addText("PRACTICAL SKILLS", T({ x: 0.7, y: 3.75, w: 5, h: 0.3, fontSize: 13, bold: true, color: GOLD, charSpacing: 2, objectName: "a2-fade" }));
    const prac = ["Using the cash register", "Serving customers", "Organising documents", "Understanding basic accounting"];
    s.addText(prac.map((p, i) => ({ text: p, options: { bullet: { indent: 18 }, breakLine: i < prac.length - 1 } })),
      T({ x: 0.7, y: 4.15, w: 5.4, h: 2.2, fontSize: 18, color: NAVY, paraSpaceAfter: 10, objectName: "a2-fade" }));
    const skills = [
      [fa.FaComments, "Communication"],
      [fa.FaPeopleGroup, "Teamwork"],
      [fa.FaUserCheck, "Responsibility"],
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
      const nm = `a${i + 3}-zoom`;
      s.addShape("hexagon", { x, y, w: hw, h: hh, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: nm });
      s.addImage({ data: await icon(ic, WHITE), x: x + hw / 2 - 0.25, y: y + 0.36, w: 0.5, h: 0.5, objectName: nm });
      s.addText(lab, T({ x: x + 0.2, y: y + 0.93, w: hw - 0.4, h: 0.7, fontSize: 14, bold: true, color: WHITE, align: "center", objectName: nm }));
    }
    footer(s, n);
    s.addNotes(
      "This internship helped me grow, at work and as a person. " +
      "I learned practical skills: using the cash register, serving customers, organising documents, and understanding basic accounting. " +
      "I also developed soft skills: communication, teamwork, responsibility, time management, problem solving and organisation."
    );
  }

  // =====================================================================
  // 17. EVALUATION
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "05 · Evaluation", "My evaluation from the company");
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
      const nm = `a${i + 4}-wipe`;
      s.addText(c, T({ x: 5.3, y, w: 4.25, h: 0.42, fontSize: 15, valign: "middle", objectName: nm }));
      s.addShape("roundRect", { x: 9.7, y: y + 0.1, w: 2.3, h: 0.22, fill: { color: TINT }, line: { color: TINT, width: 0 }, rectRadius: 0.11 });
      s.addShape("roundRect", { x: 9.7, y: y + 0.1, w: 2.3, h: 0.22, fill: { color: GOLD }, line: { color: GOLD, width: 0 }, rectRadius: 0.11, objectName: nm });
      s.addText("10", T({ x: 12.13, y, w: 0.5, h: 0.42, fontSize: 16, bold: true, align: "right", valign: "middle", objectName: nm }));
    });
    footer(s, n);
    s.addNotes(
      "At the end, my supervisor evaluated my work with eight criteria. " +
      "These are the same topics I showed you today: the company's activities, its legal documents, management functions, " +
      "information technologies, communication, foreign language, new ideas, and improvement suggestions. " +
      "I received 10 out of 10 in every criterion. My final grade is 10, excellent. I am very proud of this result."
    );
  }

  // =====================================================================
  // 18. SUPERVISOR FEEDBACK
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "05 · Feedback", "What my supervisor said");
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
      { text: "Djamel Ounnadi", options: { bold: true, color: NAVY } },
      { text: "   ·   Director, Boulangerie D.O", options: { color: MUTED } },
    ], T({ x: 0.7, y: 6.35, w: 11.93, h: 0.4, fontSize: 16, objectName: "a3-fade" }));
    footer(s, n);
    s.addNotes(
      "Here is the feedback from my supervisor, Djamel Ounnadi. " +
      "In my traineeship certificate, my supervisor wrote that I did my duties responsibly, that I showed good communication and teamwork skills, " +
      "and that I adapted well to the work environment. " +
      "In the evaluation form, my supervisor wrote: it was a pleasure having the trainee as part of our team."
    );
  }

  // =====================================================================
  // 19. CONCLUSION
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { color: WHITE };
    header(s, "06 · Conclusion", "What this internship gave me");
    const cols = [
      ["01", "Real work experience", "I worked in a real French business and saw how it is managed every day."],
      ["02", "Stronger skills", "Better communication, teamwork, customer service and administration."],
      ["03", "More confidence", "I feel ready to use these skills in my studies and my future job."],
    ];
    cols.forEach(([num, t, d], i) => {
      const x = 0.7 + i * 4.08;
      const nm = `a${i + 1}-float`;
      s.addText(num, T({ x, y: 1.95, w: 3.6, h: 0.95, fontSize: 60, bold: true, fontFace: HEAD, color: GOLD, objectName: nm }));
      s.addText(t, T({ x, y: 3.0, w: 3.6, h: 0.5, fontSize: 23, bold: true, fontFace: HEAD, objectName: nm }));
      s.addText(d, T({ x, y: 3.55, w: 3.5, h: 1.3, fontSize: 17, color: MUTED, objectName: nm }));
    });
    s.addShape("roundRect", { x: 0.7, y: 5.3, w: 11.93, h: 1.2, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.15, objectName: "a4-wipe" });
    s.addImage({ data: await icon(fa.FaGraduationCap, GOLD), x: 1.15, y: 5.5, w: 0.8, h: 0.8, objectName: "a4-wipe" });
    s.addText([
      { text: "Theory from university  +  practice in France  =  ", options: { color: WHITE } },
      { text: "real learning", options: { color: GOLD_SOFT, bold: true } },
    ], T({ x: 2.25, y: 5.3, w: 10.1, h: 1.2, fontSize: 22, fontFace: HEAD, valign: "middle", objectName: "a4-wipe" }));
    footer(s, n);
    s.addNotes(
      "To conclude, the aim of my internship was achieved. It gave me three important things. " +
      "First, real work experience in a French business. " +
      "Second, stronger skills: communication, teamwork, customer service and administration. " +
      "Third, more confidence for my studies and my future job. " +
      "For me, theory from university plus practice in France equals real learning."
    );
  }

  // =====================================================================
  // 20. THANK YOU
  // =====================================================================
  {
    const s = pres.addSlide(); n++;
    s.background = { path: bgEnd };
    [FR_BLUE, WHITE, FR_RED].forEach((c, i) =>
      s.addShape("ellipse", { x: W / 2 - 0.4 + i * 0.3, y: 1.35, w: 0.2, h: 0.2, fill: { color: c }, line: { color: c, width: 0 }, objectName: "a1-fade" })
    );
    s.addImage({ data: await icon(gi.GiCroissant, GOLD, 512), x: 2.6, y: 2.05, w: 1.3, h: 1.3, objectName: "a2-zoom" });
    s.addImage({ data: await icon(tb.TbBuildingEiffelTower, GOLD, 512), x: W - 3.9, y: 2.05, w: 1.3, h: 1.3, objectName: "a2-zoom" });
    s.addText("Merci !", T({ x: 3.9, y: 1.8, w: W - 7.8, h: 1.8, fontSize: 80, bold: true, fontFace: HEAD, color: GOLD, align: "center", valign: "middle", objectName: "a2-zoom" }));
    s.addText("Thank you for your attention", T({ x: 1.5, y: 3.75, w: W - 3, h: 0.7, fontSize: 30, color: WHITE, fontFace: HEAD, align: "center", objectName: "a3-float" }));
    s.addText("Questions?", T({ shape: "roundRect", x: W / 2 - 1.5, y: 4.75, w: 3.0, h: 0.75, rectRadius: 0.37, fill: { type: "none" }, line: { color: GOLD, width: 2 }, fontSize: 22, bold: true, color: GOLD_SOFT, align: "center", valign: "middle", objectName: "a4-zoom" }));
    s.addText(`Djoudi Mohamed Salah E  ·  ${UNI}  ·  Erasmus+ 2025/2026`, T({ x: 1.0, y: 6.35, w: W - 2, h: 0.4, fontSize: 14, color: LIGHT, align: "center", objectName: "a5-fade" }));
    s.addNotes("Thank you very much for your attention. Merci! I am happy to answer your questions.");
  }

  if (n !== TOTAL) throw new Error(`slide count ${n} != TOTAL ${TOTAL}`);
  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})();

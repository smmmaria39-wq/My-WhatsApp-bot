import { Client } from 'meowsab';
import { spawn } from 'node:child_process';
import { group, access } from "./system/control.js";
import UltraDB from "./system/UltraDB.js";
import sub from './sub.js';
import { readPanelConfig, startWebPanel } from './system/webPanel.js';
import { pullOnce } from './system/autoUpdate.mjs';

/* =========== Client ========== */
const client = new Client({
  phoneNumber: '256770898186', // Bot number
  prefix: [".", "/", "!"],
  fromMe: false, 
  owners: [
  // Owner 1
    { name: "𝑮𝑶𝑲𝑶", lid: "12 972 3211@lid", jid: "218930171336@s.whatsapp.net" },
  // Owner 2
    { name: "GOKO", lid: "218945778513@lid", jid: "218930171336@s.whatsapp.net" },
  // Owner 3
    { name: "GOKO", jid: "120363411398644841@g.us", lid: "79006443503783@lid" },
  // Owner 4 
   { name: "GOKO", jid: "201212446299@s.whatsapp.net", lid: "959666432747@lid" }
  ],
  settings: { noWelcome: true },
  commandsPath: './plugins'
});

client.onGroupEvent(group);
client.onCommandAccess(access);

/* =========== Database ========== */
if (!global.db) {
    global.db = new UltraDB();
}

/* =========== Config ========== */
const { config } = client;
config.info = { 
  nameBot: "𝑳𝑰𝑮𝑯𝑻 ┇🩸┇ 𝑩𝑶𝑻", 
  nameChannel: "𝑳𝑰𝑮𝑯𝑻 ┇🩸┇ 𝑪𝑯𝑨𝑵𝑵𝑬𝑳", 
  idChannel: "120363405545946827@newsletter",
  urls: {
    repo: "https://github.com/deveni0/Pomni-AI",
    api: "https://emam-api.web.id",
    channel: "https://whatsapp.com/channel/0029Vb7dTmNJENy9sp5yqi3T"
  },
  copyright: { 
    pack: '𝑳𝑰𝑮𝑯𝑻 ┇🩸┇ 𝑩𝑶𝑻', 
    author: '𝑳𝑰𝑮𝑯𝑻 ┇🩸┇ 𝑩𝑶𝑻'
  },
  images: [
    "https://i.supaimg.com/374589ce-56ae-4068-ba73-60f3b228637f/df4a4068-978a-4f77-afa8-bb5dd22968e1.jpg",
    "https://i.supaimg.com/374589ce-56ae-4068-ba73-60f3b228637f/0b22c6a0-3522-4e3d-b1b8-120642cb25b2.jpg",
    "https://i.supaimg.com/374589ce-56ae-4068-ba73-60f3b228637f/64789104-e032-44cd-a94f-8531fd17522c.jpg"
  ]
};

/* =========== Web Panel config ========== */
// نطبّق إعدادات طريقة الربط (QR / كود) ورقم البوت قبل تشغيل الجلسة
const panelCfg = readPanelConfig();
config.printQR = panelCfg.loginMode === 'qr'; // qr => true | code => false
if (panelCfg.phone) config.phoneNumber = panelCfg.phone;

/* =========== Start ========== */
client.start();

setTimeout(async () => {
if (client.commandSystem) { 
sub(client)
  }
}, 2000);

/* =========== Web Panel ========== */
try {
  startWebPanel(client);
} catch (e) {
  console.error('⚠️ [WEB] تعذّر تشغيل لوحة التحكم:', e.message);
}


/* =========== Auto Restart ========== */

// كل كام دقيقة يعمل البوت ريستارت (الافتراضي 10).
// غيّرها من غير ما تعدّل الكود:  RESTART_INTERVAL_MIN=15 npm start
// وعشان تقفله خالص:  RESTART_INTERVAL_MIN=0 npm start
const RESTART_INTERVAL_MIN =
  process.env.RESTART_INTERVAL_MIN === undefined
    ? 10
    : Number(process.env.RESTART_INTERVAL_MIN) || 0;
const RESTART_MS = RESTART_INTERVAL_MIN * 60 * 1000;

// لو البوت شغال على مدير عمليات أو لوحة استضافة بتعمل ريستارت لوحدها،
// بنكتفي بإنهاء العملية وهي هترجّعها تاني.
function isManaged() {
  const e = process.env;
  return Boolean(
    e.pm_id !== undefined || e.pm2_id !== undefined || e.PM2_HOME || e.NODE_APP_INSTANCE !== undefined || // pm2
    e.FOREVER_ROOT || e.FOREVER_UID ||                                                                     // forever
    e.P_SERVER_UUID || e.P_SERVER_LOCATION ||                                                              // Pterodactyl
    e.INVOCATION_ID || e.JOURNAL_STREAM ||                                                                 // systemd
    e.SERVER_MEMORY || e.SERVER_PORT                                                                       // لوحات الاستضافة
  );
}

function restartBot(reason = 'scheduled') {
  const mode = process.env.RESTART_MODE || (isManaged() ? 'exit' : 'self');
  console.log(`\n🔄 [RESTART] إعادة تشغيل البوت (${reason}) — الوضع: ${mode}`);

  // مدير العمليات: نخرجه بس وهو هيرجّعه
  if (mode === 'exit') {
    process.exit(0);
    return;
  }

  // مفيش مدير: بنشغّل نسخة جديدة مستقلة بنفس الأمر ثم نخرج
  try {
    const child = spawn(process.execPath, process.argv.slice(1), {
      cwd: process.cwd(),
      env: process.env,
      detached: true,
      stdio: 'inherit'
    });
    child.unref();
    console.log(`✅ [RESTART] تم تشغيل نسخة جديدة (PID: ${child.pid})`);
    setTimeout(() => process.exit(0), 800);
  } catch (err) {
    console.error('❌ [RESTART] فشل تشغيل نسخة جديدة:', err);
    process.exit(1);
  }
}

// نعرّضها عامًّا عشان تقدر تستخدمها في أي مكان لو حبيت
global.restartBot = restartBot;

/* =========== Auto Update from GitHub (سحب فقط) ========== */
// البوت بينزّل تحديثات الريبو لوحده عند التشغيل. عشان تقفله: AUTO_UPDATE=0
if (process.env.AUTO_UPDATE !== '0') {
  setTimeout(async () => {
    try {
      console.log('⬇️ [UPDATE] فحص تحديثات الريبو...');
      const r = await pullOnce({ log: (s) => console.log('[UPDATE]', s) });
      if (r.error) { console.log('⚠️ [UPDATE]', r.error); return; }
      if (r.changes && r.needsRestart) {
        console.log('🔁 [UPDATE] فيه كود اتغيّر — ريستارت لتطبيق التحديث');
        setTimeout(() => restartBot('تحديث تلقائي من الريبو'), 1000);
      }
    } catch (e) {
      console.error('⚠️ [UPDATE] فشل التحديث التلقائي:', e.message);
    }
  }, 8000);
} else {
  console.log('ℹ️ [UPDATE] التحديث التلقائي مقفول (AUTO_UPDATE=0)');
}

// المؤقّت: ريستارت دوري كل RESTART_INTERVAL_MIN دقيقة
if (RESTART_INTERVAL_MIN > 0) {
  setTimeout(() => restartBot(`كل ${RESTART_INTERVAL_MIN} دقيقة`), RESTART_MS);
} else {
  console.log('ℹ️ [RESTART] الريستارت الدوري مقفول (RESTART_INTERVAL_MIN=0)');
}


/* =========== Catch Errors ========== */
process.on('uncaughtException', (e) => {
    if (e.message.includes('rate-overlimit')) {}
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
});


/* 
=========== Memory Monitor ========== 

setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 800) {
        console.log(`🔄 Bot memory full (${used.toFixed(1)}MB), restarting...`)
        global.restartBot('memory full')
    }
}, 300_000) 

*/

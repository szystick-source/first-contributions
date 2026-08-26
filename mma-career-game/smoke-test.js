const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const outDir = process.env.SMOKE_OUT || '/tmp';

app.on('browser-window-created', (_e, win) => {
  const consoleLines = [];
  const flushLog = () => fs.writeFileSync(path.join(outDir, 'smoke-console.log'), consoleLines.join('\n'));
  win.webContents.on('console-message', (_e2, level, message, line, sourceId) => {
    consoleLines.push(`[${level}] ${message} (${sourceId}:${line})`);
    flushLog();
  });
  win.webContents.on('did-fail-load', (_e2, code, desc) => {
    consoleLines.push(`[did-fail-load] ${code} ${desc}`);
    flushLog();
  });

  const shot = async (name) => {
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, `smoke-${name}.png`), img.toPNG());
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = async (sel) => {
    const ok = await win.webContents.executeJavaScript(
      `(() => { const els = document.querySelectorAll(${JSON.stringify(sel)}); const el = els[els.length - 1]; if (el) { el.click(); return true; } return false; })()`
    );
    consoleLines.push(`click(${sel})=${ok}`);
    flushLog();
    return ok;
  };
  const clickNth = async (sel, n) => {
    const ok = await win.webContents.executeJavaScript(
      `(() => { const els = document.querySelectorAll(${JSON.stringify(sel)}); const el = els[${n}]; if (el) { el.click(); return true; } return false; })()`
    );
    consoleLines.push(`clickNth(${sel},${n})=${ok}`);
    flushLog();
    return ok;
  };
  const clickByText = async (text) => {
    const ok = await win.webContents.executeJavaScript(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes(${JSON.stringify(text)}));
        if (btn) { btn.click(); return true; }
        return false;
      })()
    `);
    consoleLines.push(`clickByText(${text})=${ok}`);
    flushLog();
    return ok;
  };

  win.webContents.once('did-finish-load', async () => {
    await wait(600);
    await shot('title');

    await clickByText('Nowa kariera');
    await wait(250);
    await shot('creation');

    await click('#confirm');
    await wait(300);
    await shot('shell-dashboard');

    await clickByText('Trening');
    await wait(200);
    await shot('shell-training');

    // Force a fight offer via the ranked matchmaking system, bypassing the random weekly roll.
    await win.webContents.executeJavaScript(`
      (async () => {
        const stateMod = await import('./js/state.js');
        const mmMod = await import('./js/matchmaking.js');
        stateMod.gameState.data.pendingOffer = mmMod.generateFightOffer(stateMod.gameState);
      })();
    `);
    await wait(200);

    await clickByText('Start');
    await wait(200);
    await shot('shell-offer');

    await click('#accept');
    await wait(250);
    await shot('fight-intro');

    await click('#start');
    await wait(300);
    await shot('fight-viewer-prefight-strategy');

    await click('#skip');
    await wait(600);
    await shot('fight-viewer-end');

    await click('#continue');
    await wait(250);
    await shot('post-fight-interview');

    await clickNth('#options button', 0);
    await wait(250);
    await shot('shell-after-fight');

    await clickByText('Ranking');
    await wait(250);
    await shot('shell-ranking');

    flushLog();
    app.quit();
  });
});

require('./main.js');

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
    await wait(500);
    await shot('01-menu-empty');

    // Create first career.
    await clickByText('Nowa kariera');
    await wait(200);
    await click('#confirm');
    await wait(300);
    await shot('02-shell-career1');

    // Switch back to menu without retiring.
    await clickByText('Zmień karierę');
    await wait(250);
    await shot('03-menu-one-career');

    // Create a second career.
    await clickByText('Nowa kariera');
    await wait(200);
    await click('#confirm');
    await wait(300);
    await shot('04-shell-career2');

    await clickByText('Zmień karierę');
    await wait(250);
    await shot('05-menu-two-careers');

    // Delete the second (currently listed first, most-recently-played) career.
    await clickByText('Usuń');
    await wait(150);
    await shot('06-menu-confirm-delete');
    await clickByText('Tak, usuń');
    await wait(250);
    await shot('07-menu-after-delete');

    // Continue the remaining career.
    await clickByText('Kontynuuj');
    await wait(300);
    await shot('08-shell-resumed');

    flushLog();
    app.quit();
  });
});

require('./main.js');

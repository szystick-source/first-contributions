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

  win.webContents.once('did-finish-load', async () => {
    await new Promise((r) => setTimeout(r, 600));
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(outDir, 'smoke-title.png'), img.toPNG());

    const hasBtn = await win.webContents.executeJavaScript(`!!document.getElementById('new-career')`);
    consoleLines.push(`hasBtn=${hasBtn}`);
    flushLog();

    if (hasBtn) {
      await win.webContents.executeJavaScript(`document.getElementById('new-career').click();`);
      await new Promise((r) => setTimeout(r, 300));
      const img2 = await win.webContents.capturePage();
      fs.writeFileSync(path.join(outDir, 'smoke-creation.png'), img2.toPNG());

      const hasConfirm = await win.webContents.executeJavaScript(`!!document.getElementById('confirm')`);
      consoleLines.push(`hasConfirm=${hasConfirm}`);
      flushLog();
      if (hasConfirm) {
        await win.webContents.executeJavaScript(`document.getElementById('confirm').click();`);
        await new Promise((r) => setTimeout(r, 400));
        const img3 = await win.webContents.capturePage();
        fs.writeFileSync(path.join(outDir, 'smoke-hub.png'), img3.toPNG());

        const hasTrain = await win.webContents.executeJavaScript(
          `Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Trenuj'))`
        );
        consoleLines.push(`hasTrainButton=${hasTrain}`);
        flushLog();

        if (hasTrain) {
          await win.webContents.executeJavaScript(
            `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Trenuj')).click();`
          );
          await new Promise((r) => setTimeout(r, 300));
          const imgTrain = await win.webContents.capturePage();
          fs.writeFileSync(path.join(outDir, 'smoke-training.png'), imgTrain.toPNG());

          // Force a fight offer to appear so we can play through the fight screen,
          // regardless of the random weekly roll, then click through to a fight.
          await win.webContents.executeJavaScript(`
            (async () => {
              const stateMod = await import('./js/state.js');
              const mmMod = await import('./js/matchmaking.js');
              stateMod.gameState.data.pendingOffer = mmMod.generateFightOffer(stateMod.gameState.data.player);
            })();
          `);
          await new Promise((r) => setTimeout(r, 200));

          const goBack = await win.webContents.executeJavaScript(
            `(() => { const b = document.getElementById('back'); if (b) { b.click(); return true; } return false; })()`
          );
          consoleLines.push(`clickedBackToHub=${goBack}`);
          await new Promise((r) => setTimeout(r, 300));
          const imgHub2 = await win.webContents.capturePage();
          fs.writeFileSync(path.join(outDir, 'smoke-hub-offer.png'), imgHub2.toPNG());

          const clickedAccept = await win.webContents.executeJavaScript(
            `(() => { const b = document.getElementById('accept'); if (b) { b.click(); return true; } return false; })()`
          );
          consoleLines.push(`clickedAccept=${clickedAccept}`);
          await new Promise((r) => setTimeout(r, 300));
          const imgFightIntro = await win.webContents.capturePage();
          fs.writeFileSync(path.join(outDir, 'smoke-fight-intro.png'), imgFightIntro.toPNG());

          const clickedStart = await win.webContents.executeJavaScript(
            `(() => { const b = document.getElementById('start'); if (b) { b.click(); return true; } return false; })()`
          );
          consoleLines.push(`clickedStart=${clickedStart}`);
          await new Promise((r) => setTimeout(r, 800));
          const imgFightMid = await win.webContents.capturePage();
          fs.writeFileSync(path.join(outDir, 'smoke-fight-mid.png'), imgFightMid.toPNG());

          const clickedSkip = await win.webContents.executeJavaScript(
            `(() => { const b = document.getElementById('skip'); if (b) { b.click(); return true; } return false; })()`
          );
          consoleLines.push(`clickedSkip=${clickedSkip}`);
          await new Promise((r) => setTimeout(r, 400));
          const imgFightEnd = await win.webContents.capturePage();
          fs.writeFileSync(path.join(outDir, 'smoke-fight-end.png'), imgFightEnd.toPNG());

          const clickedContinue = await win.webContents.executeJavaScript(
            `(() => { const b = document.getElementById('continue'); if (b) { b.click(); return true; } return false; })()`
          );
          consoleLines.push(`clickedContinue=${clickedContinue}`);
          await new Promise((r) => setTimeout(r, 300));
          const imgInterview = await win.webContents.capturePage();
          fs.writeFileSync(path.join(outDir, 'smoke-interview.png'), imgInterview.toPNG());
        }
      }
    }

    flushLog();
    app.quit();
  });
});

require('./main.js');
